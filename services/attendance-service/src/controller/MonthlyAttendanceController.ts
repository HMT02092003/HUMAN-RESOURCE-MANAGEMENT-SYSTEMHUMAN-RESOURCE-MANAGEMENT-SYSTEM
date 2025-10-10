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
    businessTripInfo?: string; // Thông tin công tác
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
