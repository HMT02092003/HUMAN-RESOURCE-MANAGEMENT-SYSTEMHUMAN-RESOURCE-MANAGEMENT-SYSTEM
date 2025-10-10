import { Request, Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import axios from 'axios';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import SettingModel from '@/Models/SettingsModel';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

interface WorkingDaysConfig {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
}

interface ApprovedLeaveApplication {
    id: number;
    type: string;
    userId: number;
    status: string;
    data: any;
    applicationDate: string;
    approvedDate: string;
}

interface DailyAttendanceDetail {
    date: string; // YYYY-MM-DD
    dayOfWeek: number; // 0-6 (0=Sunday)
    dayName: string; // "Thứ 2", "Thứ 3", ...
    isWorkingDay: boolean;
    hasAttendance: boolean;
    attendanceData?: any; // Dữ liệu chấm công nếu có
    hasApprovedLeave: boolean; // Có đơn nghỉ phép được duyệt
    leaveType?: string; // Loại đơn nghỉ
    status: 'working' | 'absent' | 'approved_leave' | 'business_trip' | 'weekend' | 'holiday';
    statusText: string;
    unauthorizedAbsencePenalty: number; // Tiền phạt nghỉ không phép
    isOnTime: boolean; // Chấm công đúng giờ (không muộn, không về sớm)
    lateMinutes?: number; // Số phút đi muộn
    earlyLeaveMinutes?: number; // Số phút về sớm
    businessTripInfo?: string; // Thông tin công tác (tripInfo)
    businessTripDestination?: string; // Địa điểm công tác
    leaveInfo?: string; // Lý do nghỉ phép
}

/**
 * Lấy danh sách đơn nghỉ phép đã được duyệt của user trong tháng
 */
async function getApprovedLeaveApplications(
    userId: number,
    year: number,
    month: number
): Promise<ApprovedLeaveApplication[]> {
    try {
        const APPLICATION_SERVICE_URL = process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004';

        // Gọi API inter-service (không cần token)
        const response = await axios.get(
            `${APPLICATION_SERVICE_URL}/api/applications/user/${userId}/approved`,
            {
                params: {
                    year,
                    month
                }
            }
        );

        console.log('✅ Approved applications:', response.data);

        return response.data.data || [];
    } catch (error: any) {
        console.error('❌ Error fetching approved applications:', error.message);
        return [];
    }
}

/**
 * Check xem ngày cụ thể có nằm trong đơn nghỉ phép được duyệt không
 */
function checkDateHasApprovedLeave( 
    date: string,
    applications: ApprovedLeaveApplication[]
): { hasLeave: boolean; leaveType?: string; leaveInfo?: string } {
    for (const app of applications) {
        // Check các loại đơn nghỉ phép (leave, sick-leave) - KHÔNG bao gồm business-trip và forgot-check
        if (app.type === 'leave' || app.type === 'sick-leave') {
            const appData = app.data;

            // Trường hợp nghỉ nhiều ngày (có startDate và endDate)
            if (appData.startDate && appData.endDate) {
                const checkDate = dayjs(date);
                const startDate = dayjs(appData.startDate);
                const endDate = dayjs(appData.endDate);

                if (checkDate.isSame(startDate, 'day') || checkDate.isSame(endDate, 'day') ||
                    (checkDate.isAfter(startDate, 'day') && checkDate.isBefore(endDate, 'day'))) {
                    console.log(`✅ Date ${date} is within approved leave: ${app.type}`);
                    return { 
                        hasLeave: true, 
                        leaveType: app.type, // 'leave' hoặc 'sick-leave'
                        leaveInfo: appData.reason || appData.description || 'Nghỉ phép'
                    };
                }
            }

            // Trường hợp nghỉ 1 ngày (có date)
            if (appData.date && dayjs(appData.date).isSame(dayjs(date), 'day')) {
                console.log(`✅ Date ${date} matches approved leave date: ${app.type}`);
                return { 
                    hasLeave: true, 
                    leaveType: app.type,
                    leaveInfo: appData.reason || appData.description || 'Nghỉ phép'
                };
            }

            // Trường hợp có requestedDates array
            if (appData.requestedDates && Array.isArray(appData.requestedDates)) {
                for (const reqDate of appData.requestedDates) {
                    if (dayjs(reqDate.date || reqDate).isSame(dayjs(date), 'day')) {
                        console.log(`✅ Date ${date} found in requestedDates: ${app.type}`);
                        return { 
                            hasLeave: true, 
                            leaveType: app.type,
                            leaveInfo: appData.reason || appData.description || 'Nghỉ phép'
                        };
                    }
                }
            }
        }
    }

    return { hasLeave: false };
}

/**
 * Check xem ngày cụ thể có nằm trong đơn công tác được duyệt không
 */
function checkDateHasBusinessTrip(
    date: string,
    applications: ApprovedLeaveApplication[]
): { hasBusinessTrip: boolean; tripInfo?: string; destination?: string } {
    for (const app of applications) {
        // Chỉ check đơn công tác
        if (app.type === 'business-trip') {
            const appData = app.data;

            // Trường hợp công tác nhiều ngày
            if (appData.startDate && appData.endDate) {
                const checkDate = dayjs(date);
                const startDate = dayjs(appData.startDate);
                const endDate = dayjs(appData.endDate);

                // Sử dụng isSameOrBefore và isSameOrAfter thay vì isBetween
                if ((checkDate.isSame(startDate, 'day') || checkDate.isAfter(startDate, 'day')) &&
                    (checkDate.isSame(endDate, 'day') || checkDate.isBefore(endDate, 'day'))) {
                    console.log(`✅ Found business trip for ${date}:`, {
                        startDate: appData.startDate,
                        endDate: appData.endDate,
                        destination: appData.destination || appData.location
                    });
                    return {
                        hasBusinessTrip: true,
                        tripInfo: appData.reason || 'Công tác',
                        destination: appData.destination || appData.location || 'Chưa rõ địa điểm'
                    };
                }
            }

            // Trường hợp công tác 1 ngày
            if (appData.date && dayjs(appData.date).isSame(dayjs(date), 'day')) {
                console.log(`✅ Found single-day business trip for ${date}`);
                return {
                    hasBusinessTrip: true,
                    tripInfo: appData.reason || 'Công tác',
                    destination: appData.destination || appData.location || 'Chưa rõ địa điểm'
                };
            }
        }
    }

    return { hasBusinessTrip: false };
}

/**
 * Lấy cấu hình ngày làm việc từ Settings
 */
async function getWorkingDaysConfig(): Promise<WorkingDaysConfig> {
    try {
        const setting = await SettingModel.query().findOne('key', 'WorkingDays');

        if (setting && setting.value) {
            const workingDays = typeof setting.value === 'string'
                ? JSON.parse(setting.value)
                : setting.value;

            return workingDays;
        }
    } catch (error) {
        console.error('Error fetching working days config:', error);
    }

    // Default: T2-T6
    return {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
    };
}

/**
 * Lấy tỷ lệ phạt nghỉ không phép từ Settings
 */
async function getUnauthorizedAbsencePenaltyRate(): Promise<number> {
    try {
        const setting = await SettingModel.query().findOne('key', 'UnauthorizedAbsencePenaltyRate');

        if (setting && setting.value) {
            const penaltyConfig = typeof setting.value === 'string'
                ? JSON.parse(setting.value)
                : setting.value;

            return penaltyConfig.rate || 5; // Default 5%
        }
    } catch (error) {
        console.error('Error fetching penalty rate:', error);
    }

    return 5; // Default 5%
}

/**
 * Lấy lương tháng của user (cần gọi sang Employee Service)
 */
async function getUserMonthlySalary(userId: number, token?: string): Promise<number> {
    try {
        const EMPLOYEE_SERVICE_URL = process.env['EMPLOYEE_SERVICE_URL'] || 'http://localhost:4002';

        const response = await axios.get(
            `${EMPLOYEE_SERVICE_URL}/api/employee/user/${userId}`,
            {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            }
        );

        const salary = response.data?.salary || response.data?.data?.salary || 0;
        console.log(`💰 User ${userId} monthly salary:`, salary);

        return salary;
    } catch (error: any) {
        console.error('❌ Error fetching user salary:', error.message);
        return 0;
    }
}

/**
 * Check ngày có phải working day không
 */
function isWorkingDay(date: string, workingDays: WorkingDaysConfig): boolean {
    const dayOfWeek = dayjs(date).day(); // 0=Sunday, 1=Monday, ...

    const dayMap: { [key: number]: keyof WorkingDaysConfig } = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
    };

    const dayKey = dayMap[dayOfWeek];
    if (!dayKey) return false;
    return workingDays[dayKey] || false;
}

/**
 * Get day name in Vietnamese
 */
function getDayName(dayOfWeek: number): string {
    const dayNames = [
        'Chủ nhật',
        'Thứ hai',
        'Thứ ba',
        'Thứ tư',
        'Thứ năm',
        'Thứ sáu',
        'Thứ bảy'
    ];

    return dayNames[dayOfWeek] || '';
}

/**
 * API: Lấy chi tiết chấm công theo tháng với penalty nghỉ không phép
 */
export const getMonthlyAttendanceDetail = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;

        if (!userId || !year || !month) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: userId, year, month'
            });
        }

        const userIdNum = parseInt(userId as string);
        const yearNum = parseInt(year as string);
        const monthNum = parseInt(month as string);

        console.log(`📅 Generating monthly attendance detail for user ${userIdNum}, ${yearNum}-${monthNum}`);

        // 1. Lấy config
        const workingDaysConfig = await getWorkingDaysConfig();
        const penaltyRate = await getUnauthorizedAbsencePenaltyRate();
        const monthlySalary = await getUserMonthlySalary(
            userIdNum,
            req.headers.authorization?.replace('Bearer ', '')
        );

        console.log('⚙️ Config:', { workingDaysConfig, penaltyRate, monthlySalary });

        // 2. Lấy tất cả attendance trong tháng
        const startDate = dayjs(`${yearNum}-${monthNum}-01`).format('YYYY-MM-DD');
        const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

        const attendances = await TimeAttendanceModel.query()
            .where('userId', userIdNum)
            .whereBetween('date', [startDate, endDate])
            .orderBy('date', 'asc');

        console.log(`✅ Found ${attendances.length} attendance records`);

        // 3. Lấy đơn nghỉ phép đã duyệt
        const approvedApplications = await getApprovedLeaveApplications(
            userIdNum,
            yearNum,
            monthNum
        );

        console.log(`📋 Found ${approvedApplications.length} approved applications`);
        console.log('📋 Applications detail:', JSON.stringify(approvedApplications, null, 2));
        
        // Debug: Check business trip applications specifically
        const businessTripApps = approvedApplications.filter(app => app.type === 'business-trip');
        console.log(`🚀 Business trip applications: ${businessTripApps.length}`);
        businessTripApps.forEach(app => {
            console.log(`   - Type: ${app.type}, Start: ${app.data.startDate}, End: ${app.data.endDate}, Destination: ${app.data.destination || app.data.location}`);
        });

        // Debug: Check leave applications specifically
        const leaveApps = approvedApplications.filter(app => app.type === 'leave' || app.type === 'sick-leave');
        console.log(`🏖️ Leave applications: ${leaveApps.length}`);
        leaveApps.forEach(app => {
            console.log(`   - Type: ${app.type}, Date: ${app.data.date}, Start: ${app.data.startDate}, End: ${app.data.endDate}, Reason: ${app.data.reason}`);
        });

        // 4. Generate daily details
        const daysInMonth = dayjs(startDate).daysInMonth();
        const today = dayjs().format('YYYY-MM-DD');
        const dailyDetails: DailyAttendanceDetail[] = [];

        let totalUnauthorizedAbsencePenalty = 0;
        let unauthorizedAbsenceDays = 0;
        let totalLateMinutes = 0;
        let totalEarlyLeaveMinutes = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = dayjs(`${yearNum}-${monthNum}-${day}`).format('YYYY-MM-DD');
            const dayOfWeek = dayjs(currentDate).day();
            const dayName = getDayName(dayOfWeek);
            const isWorking = isWorkingDay(currentDate, workingDaysConfig);
            const isPastOrToday = dayjs(currentDate).isSameOrBefore(today, 'day');

            const attendance = attendances.find(att =>
                dayjs(att.date).isSame(dayjs(currentDate), 'day')
            );

            const leaveCheck = checkDateHasApprovedLeave(currentDate, approvedApplications);
            const businessTripCheck = checkDateHasBusinessTrip(currentDate, approvedApplications);
            
            // Debug logging for specific dates
            if (currentDate === '2025-10-08' || currentDate === '2025-10-09') {
                console.log(`🔍 DEBUG ${currentDate}:`, {
                    hasBusinessTrip: businessTripCheck.hasBusinessTrip,
                    tripInfo: businessTripCheck.tripInfo,
                    destination: businessTripCheck.destination,
                    totalApps: approvedApplications.length,
                    businessTripApps: approvedApplications.filter(a => a.type === 'business-trip').length
                });
            }

            let dailyDetail: DailyAttendanceDetail;

            if (!isWorking) {
                // Weekend
                dailyDetail = {
                    date: currentDate,
                    dayOfWeek,
                    dayName,
                    isWorkingDay: false,
                    hasAttendance: false,
                    hasApprovedLeave: false,
                    status: 'weekend',
                    statusText: 'Ngày nghỉ',
                    unauthorizedAbsencePenalty: 0,
                    isOnTime: false
                };
            } else if (businessTripCheck.hasBusinessTrip) {
                // ƯU TIÊN 1: Có đơn công tác đã duyệt - TÍNH CÔNG như đi làm bình thường
                dailyDetail = {
                    date: currentDate,
                    dayOfWeek,
                    dayName,
                    isWorkingDay: true,
                    hasAttendance: false,
                    hasApprovedLeave: false,
                    status: 'business_trip',
                    statusText: `Công tác - ${businessTripCheck.destination || ''}`,
                    unauthorizedAbsencePenalty: 0,
                    isOnTime: true, // Công tác được tính là đúng giờ
                    businessTripInfo: businessTripCheck.tripInfo || '',
                    businessTripDestination: businessTripCheck.destination || ''
                };
            } else if (leaveCheck.hasLeave) {
                // ƯU TIÊN 2: Nghỉ phép (có đơn nghỉ đã duyệt)
                dailyDetail = {
                    date: currentDate,
                    dayOfWeek,
                    dayName,
                    isWorkingDay: true,
                    hasAttendance: false,
                    hasApprovedLeave: true,
                    leaveType: leaveCheck.leaveType || 'leave',
                    leaveInfo: leaveCheck.leaveInfo || 'Nghỉ phép',
                    status: 'approved_leave',
                    statusText: 'Nghỉ phép',
                    unauthorizedAbsencePenalty: 0,
                    isOnTime: false
                };
            } else if (attendance) {
                // ƯU TIÊN 3: Có chấm công - kiểm tra đúng giờ hay không
                
                // 🛠️ SỬA LỖI: Ép kiểu sang số để đảm bảo tính toán chính xác
                const lateMinutes = Number(attendance.lateMinutes) || 0; 
                const earlyLeaveMinutes = Number(attendance.earlyDepartureMinutes) || 0; 
                const isOnTime = lateMinutes === 0 && earlyLeaveMinutes === 0;

                // Cộng dồn số phút muộn/sớm (Bây giờ đã là phép cộng số)
                totalLateMinutes += lateMinutes;
                totalEarlyLeaveMinutes += earlyLeaveMinutes;

                dailyDetail = {
                    date: currentDate,
                    dayOfWeek,
                    dayName,
                    isWorkingDay: true,
                    hasAttendance: true,
                    attendanceData: attendance,
                    hasApprovedLeave: false,
                    status: 'working',
                    statusText: 'Đã chấm công',
                    unauthorizedAbsencePenalty: 0,
                    isOnTime,
                    lateMinutes,
                    earlyLeaveMinutes
                };
            } else {
                // ƯU TIÊN 4: Nghỉ không phép - tính phạt nếu <= today
                const penalty = isPastOrToday ? (monthlySalary * penaltyRate) / 100 : 0;

                dailyDetail = {
                    date: currentDate,
                    dayOfWeek,
                    dayName,
                    isWorkingDay: true,
                    hasAttendance: false,
                    hasApprovedLeave: false,
                    status: 'absent',
                    statusText: isPastOrToday ? 'Nghỉ' : 'Chưa chấm công',
                    unauthorizedAbsencePenalty: penalty,
                    isOnTime: false
                };

                if (isPastOrToday) {
                    totalUnauthorizedAbsencePenalty += penalty;
                    unauthorizedAbsenceDays++;
                }
            }

            dailyDetails.push(dailyDetail);
        }

        console.log(`💰 Total unauthorized absence penalty: ${totalUnauthorizedAbsencePenalty} VND for ${unauthorizedAbsenceDays} days`);
        console.log(`⏰ Total late minutes: ${totalLateMinutes}, Total early leave minutes: ${totalEarlyLeaveMinutes}`);

        // 5. Return response
        return res.status(200).json({
            success: true,
            data: {
                userId: userIdNum,
                year: yearNum,
                month: monthNum,
                monthlySalary,
                penaltyRate,
                dailyDetails,
                summary: {
                    totalDays: daysInMonth,
                    workingDays: dailyDetails.filter(d => d.isWorkingDay).length,
                    attendedDays: dailyDetails.filter(d => d.hasAttendance).length,
                    approvedLeaveDays: dailyDetails.filter(d => d.hasApprovedLeave).length,
                    unauthorizedAbsenceDays,
                    totalUnauthorizedAbsencePenalty,
                    weekendDays: dailyDetails.filter(d => d.status === 'weekend').length,
                    // 🛠️ SỬA LỖI: Trả về số nguyên bằng Math.round() hoặc giữ nguyên totalLateMinutes
                    totalLateMinutes: Math.round(totalLateMinutes), 
                    totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
                    onTimeDays: dailyDetails.filter(d => d.isOnTime).length
                }
            }
        });

    } catch (error: any) {
        console.error('❌ Error in getMonthlyAttendanceDetail:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}

/**
 * 🚀 API TỔNG HỢP: Lấy thống kê tháng + chi tiết từng ngày trong 1 request
 * GET /api/attendance/user/:userId/monthly-full?year=YYYY&month=MM
 * 
 * Kết hợp dữ liệu từ 2 API:
 * - getMonthlyStats: Thống kê tổng quan (totalDays, presentDays, totalHours, penalties, overtime)
 * - getMonthlyAttendanceDetail: Chi tiết từng ngày (dailyDetails, summary, penalty breakdown)
 * 
 * Lợi ích:
 * - Giảm 66% số lượng API calls (từ 3 xuống 1)
 * - Tăng tốc độ load trang
 * - Đảm bảo tính nhất quán dữ liệu (1 transaction)
 */
export const getMonthlyAttendanceFull = async (req: Request, res: Response) => {
    try {
        console.log('🔥🔥🔥 ===== GET MONTHLY ATTENDANCE FULL API CALLED =====');
        
        const { userId } = req.params;
        const { year, month } = req.query;

        if (!userId || !year || !month) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: userId, year, month'
            });
        }

        const userIdNum = parseInt(userId as string);
        const yearNum = parseInt(year as string);
        const monthNum = parseInt(month as string);

        console.log(`📊 Fetching FULL monthly data for user ${userIdNum}, ${yearNum}-${monthNum}`);

        // 1. Get working days config from settings
        const workingDaysConfig = await getWorkingDaysConfig();
        const penaltyRate = await getUnauthorizedAbsencePenaltyRate();
        const monthlySalary = await getUserMonthlySalary(
            userIdNum,
            req.headers.authorization?.replace('Bearer ', '')
        );

        console.log('⚙️ Config loaded:', { workingDaysConfig, penaltyRate, monthlySalary });

        // 2. Get approved applications (leave, business trip) from application service
        const approvedApplications = await getApprovedLeaveApplications(userIdNum, yearNum, monthNum);
        console.log(`📋 Found ${approvedApplications.length} approved applications`);

        // 3. Get attendance records
        const startDate = dayjs(`${yearNum}-${String(monthNum).padStart(2, '0')}-01`).format('YYYY-MM-DD');
        const endDate = dayjs(`${yearNum}-${String(monthNum).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');

        console.log(`🔍 Querying attendance records:`, {
            userId: userIdNum,
            startDate,
            endDate,
            table: TimeAttendanceModel.tableName
        });

        const attendanceRecords = await TimeAttendanceModel.query()
            .where('userId', userIdNum)
            .whereBetween('date', [startDate, endDate])
            .orderBy('date', 'asc');

        console.log(`📅 Found ${attendanceRecords.length} attendance records for September`);
        if (attendanceRecords.length > 0) {
            console.log(`📌 First 3 records with dates:`, attendanceRecords.slice(0, 3).map(r => ({
                id: r.id,
                date: r.date,
                dateType: typeof r.date,
                checkInTime: r.checkInTime,
                checkOutTime: r.checkOutTime
            })));
        } else {
            console.log(`⚠️ No attendance records found! Checking database...`);
            // Try to find ANY records for this user
            const anyRecords = await TimeAttendanceModel.query()
                .where('userId', userIdNum)
                .limit(5);
            console.log(`🔍 Any records for userId ${userIdNum}:`, anyRecords.length, anyRecords);
        }

        // 4. Build daily details array
        const daysInMonth = dayjs(`${yearNum}-${String(monthNum).padStart(2, '0')}-01`).daysInMonth();
        const dailyDetails: DailyAttendanceDetail[] = [];
        
        let totalUnauthorizedAbsencePenalty = 0;
        let unauthorizedAbsenceDays = 0;
        let totalLateMinutes = 0;
        let totalEarlyLeaveMinutes = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = dayjs(`${yearNum}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
            const dateStr = currentDate.format('YYYY-MM-DD');
            const dayOfWeek = currentDate.day();
            const dayName = getDayName(dayOfWeek);

            const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek] as keyof WorkingDaysConfig;
            const isWorkingDay = workingDaysConfig[dayKey] || false;

            // IMPORTANT: So sánh date - Convert record.date (Date object) to YYYY-MM-DD string
            const attendanceData = attendanceRecords.find(record => {
                // Convert Date object to YYYY-MM-DD string for comparison
                const recordDateStr = dayjs(record.date).format('YYYY-MM-DD');
                return recordDateStr === dateStr;
            });
            const hasAttendance = !!attendanceData?.checkInTime;

            // Check for approved leave
            const leaveCheck = checkDateHasApprovedLeave(dateStr, approvedApplications);
            const hasApprovedLeave = leaveCheck.hasLeave;

            // Check for business trip
            const businessTripCheck = checkDateHasBusinessTrip(dateStr, approvedApplications);
            const hasBusinessTrip = businessTripCheck.hasBusinessTrip;

            // Debug log for this date
            if (day <= 3 || hasAttendance || hasApprovedLeave || hasBusinessTrip) {
                console.log(`🔍 Date ${dateStr}:`, {
                    isWorkingDay,
                    hasAttendance,
                    hasApprovedLeave,
                    hasBusinessTrip,
                    checkInTime: attendanceData?.checkInTime,
                    checkOutTime: attendanceData?.checkOutTime
                });
            }

            let status: 'working' | 'absent' | 'approved_leave' | 'business_trip' | 'weekend' | 'holiday' = 'working';
            let statusText = 'Đi làm';
            let dailyPenalty = 0;

            if (!isWorkingDay) {
                status = 'weekend';
                statusText = 'Cuối tuần';
            } else if (hasBusinessTrip) {
                status = 'business_trip';
                statusText = 'Công tác';
            } else if (hasApprovedLeave) {
                status = 'approved_leave';
                statusText = 'Nghỉ phép (Đã duyệt)';
            } else if (!hasAttendance) {
                status = 'absent';
                statusText = 'Vắng không phép';
                dailyPenalty = (monthlySalary * penaltyRate / 100);
                totalUnauthorizedAbsencePenalty += dailyPenalty;
                unauthorizedAbsenceDays++;
            }

            // Calculate late and early leave
            const lateMinutes = parseFloat(attendanceData?.lateMinutes?.toString() || '0');
            const earlyLeaveMinutes = parseFloat(attendanceData?.earlyDepartureMinutes?.toString() || '0');
            const isOnTime = hasAttendance && lateMinutes === 0 && earlyLeaveMinutes === 0;

            if (hasAttendance) {
                totalLateMinutes += lateMinutes;
                totalEarlyLeaveMinutes += earlyLeaveMinutes;
            }

            const dailyDetail: DailyAttendanceDetail = {
                date: dateStr,
                dayOfWeek,
                dayName,
                isWorkingDay,
                hasAttendance,
                attendanceData: hasAttendance ? attendanceData : undefined, // Luôn thêm attendanceData nếu có
                hasApprovedLeave,
                status,
                statusText,
                unauthorizedAbsencePenalty: dailyPenalty,
                isOnTime
            };

            // Add optional fields if they exist
            if (leaveCheck.leaveType) dailyDetail.leaveType = leaveCheck.leaveType;
            if (leaveCheck.leaveInfo) dailyDetail.leaveInfo = leaveCheck.leaveInfo;
            if (businessTripCheck.tripInfo) dailyDetail.businessTripInfo = businessTripCheck.tripInfo;
            if (businessTripCheck.destination) dailyDetail.businessTripDestination = businessTripCheck.destination;
            if (hasAttendance) {
                dailyDetail.lateMinutes = lateMinutes;
                dailyDetail.earlyLeaveMinutes = earlyLeaveMinutes;
            }

            dailyDetails.push(dailyDetail);
        }

        console.log(`📊 Created ${dailyDetails.length} daily details for month ${monthNum}/${yearNum}`);
        console.log(`📌 Sample dates:`, dailyDetails.slice(0, 5).map(d => `${d.date} (${d.status})`));

        // 5. Calculate monthly statistics (from attendance records)
        const monthlyStats = {
            totalDays: attendanceRecords.length,
            presentDays: attendanceRecords.filter(record => record.checkInTime).length,
            absentDays: attendanceRecords.filter(record => !record.checkInTime).length,
            lateDays: attendanceRecords.filter(record => parseFloat(record.lateMinutes?.toString() || '0') > 0).length,
            earlyLeaveDays: attendanceRecords.filter(record => parseFloat(record.earlyDepartureMinutes?.toString() || '0') > 0).length,
            totalHours: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.dailyTotalWorkHours?.toString() || '0'), 0),
            averageHours: 0,
            overtimeHours: attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.otMinutes?.toString() || '0') / 60), 0),
            totalLatePenalty: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.lateArrivalPenalty?.toString() || '0'), 0),
            totalEarlyLeavePenalty: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.earlyLeavePenalty?.toString() || '0'), 0),
            totalPenalty: 0,
            totalOvertimePay: attendanceRecords.reduce((sum, record) => sum + parseFloat(record.otSalary?.toString() || '0'), 0)
        };

        // Calculate average hours
        monthlyStats.averageHours = monthlyStats.presentDays > 0 ? monthlyStats.totalHours / monthlyStats.presentDays : 0;
        
        // Calculate total penalty
        monthlyStats.totalPenalty = monthlyStats.totalLatePenalty + monthlyStats.totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;

        console.log('✅ Monthly stats calculated:', monthlyStats);
        console.log(`💰 Total unauthorized absence penalty: ${totalUnauthorizedAbsencePenalty} VND for ${unauthorizedAbsenceDays} days`);
        console.log(`✅ Final response - dailyDetails count: ${dailyDetails.length}`);
        console.log(`📋 Status breakdown:`, {
            working: dailyDetails.filter(d => d.status === 'working').length,
            absent: dailyDetails.filter(d => d.status === 'absent').length,
            leave: dailyDetails.filter(d => d.status === 'approved_leave').length,
            businessTrip: dailyDetails.filter(d => d.status === 'business_trip').length,
            weekend: dailyDetails.filter(d => d.status === 'weekend').length
        });

        // 6. Return unified response
        return res.status(200).json({
            success: true,
            data: {
                // Monthly overview statistics
                monthlyStats,
                
                // Daily details for calendar display
                dailyData: {
                    userId: userIdNum,
                    year: yearNum,
                    month: monthNum,
                    monthlySalary,
                    penaltyRate,
                    dailyDetails,
                    summary: {
                        totalDays: daysInMonth,
                        workingDays: dailyDetails.filter(d => d.isWorkingDay).length,
                        attendedDays: dailyDetails.filter(d => d.hasAttendance).length,
                        approvedLeaveDays: dailyDetails.filter(d => d.hasApprovedLeave).length,
                        unauthorizedAbsenceDays,
                        totalUnauthorizedAbsencePenalty,
                        weekendDays: dailyDetails.filter(d => d.status === 'weekend').length,
                        totalLateMinutes: Math.round(totalLateMinutes),
                        totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
                        onTimeDays: dailyDetails.filter(d => d.isOnTime).length
                    }
                }
            }
        });

    } catch (error: any) {
        console.error('❌ Error in getMonthlyAttendanceFull:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}
