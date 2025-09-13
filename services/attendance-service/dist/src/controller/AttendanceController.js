import connection from '@/lib/Databases/Connection';
import dayjs from 'dayjs';
export const confirmAttendance = async (req, res) => {
    try {
        console.log('=== ATTENDANCE DATA RECEIVED ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        const { userId, location, device, confidence, method } = req.body;
        if (!userId) {
            console.log('❌ Missing required fields:', { userId });
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin userId'
            });
        }
        const currentDate = dayjs().format('YYYY-MM-DD');
        const currentTime = dayjs().toISOString();
        console.log('✅ Processing attendance for:');
        console.log('- User ID:', userId);
        console.log('- Date:', currentDate);
        console.log('- Current Time:', currentTime);
        const existingAttendance = await connection('time_attendances')
            .where('userId', userId)
            .where('date', currentDate)
            .first();
        let attendanceType;
        let updateData = {};
        let isNewRecord = false;
        if (!existingAttendance) {
            attendanceType = 'check_in';
            updateData = {
                userId: parseInt(userId),
                date: currentDate,
                checkInTime: currentTime,
                checkOutTime: null,
                dailyTotalWorkHours: 0,
                lateMinutes: 0,
                earlyDepartureMinutes: 0,
                dailyWorkingUnit: 0,
                earlyLeavePenalty: 0,
                lateArrivalPenalty: 0,
                otWorkingUnit: 0,
                otMinutes: 0,
                otSalary: 0,
                created_at: currentTime,
                updated_at: currentTime
            };
            isNewRecord = true;
            console.log('📝 ✅ CHƯA CÓ BẢN GHI: Tạo mới CHECK-IN');
            console.log('- Check-in time:', currentTime);
        }
        else {
            attendanceType = 'check_out';
            const checkInTime = dayjs(existingAttendance.checkInTime);
            const checkOutTime = dayjs(currentTime);
            const workHours = checkOutTime.diff(checkInTime, 'hour', true);
            updateData = {
                checkOutTime: currentTime,
                dailyTotalWorkHours: Math.round(workHours * 100) / 100,
                updated_at: currentTime
            };
            console.log('📝 ✅ ĐÃ CÓ BẢN GHI: Cập nhật CHECK-OUT (ghi đè)');
            console.log('- Check-in time (giữ nguyên):', existingAttendance.checkInTime);
            console.log('- Check-out time (ghi đè):', currentTime);
            console.log('- Work hours calculated:', updateData.dailyTotalWorkHours);
        }
        let result;
        if (isNewRecord) {
            [result] = await connection('time_attendances').insert(updateData).returning('*');
        }
        else {
            await connection('time_attendances')
                .where('userId', userId)
                .where('date', currentDate)
                .update(updateData);
            result = await connection('time_attendances')
                .where('userId', userId)
                .where('date', currentDate)
                .first();
        }
        console.log('✅ Database operation completed');
        console.log('- Attendance Type:', attendanceType);
        console.log('- Record:', result);
        let message = '';
        switch (attendanceType) {
            case 'check_in':
                message = 'Check-in thành công';
                break;
            case 'check_out':
                message = 'Check-out thành công (ghi đè thời gian mới nhất)';
                break;
            default:
                message = 'Chấm công thành công';
        }
        const responseData = {
            success: true,
            message: message,
            data: {
                userId: parseInt(userId),
                attendanceType,
                date: currentDate,
                checkInTime: result.checkInTime,
                checkOutTime: result.checkOutTime,
                workHours: result.dailyTotalWorkHours,
                timestamp: currentTime,
                confidence,
                method,
                device,
                location,
                status: result.checkOutTime ? 'completed' : 'partial',
                processedAt: dayjs().toISOString()
            }
        };
        console.log('✅ Attendance processed successfully:', JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);
    }
    catch (error) {
        console.error('❌ Error confirming attendance:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xác nhận chấm công',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
export const getAttendanceStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { date } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu userId'
            });
        }
        const targetDate = date || dayjs().format('YYYY-MM-DD');
        const attendance = await connection('time_attendances')
            .where('userId', userId)
            .where('date', targetDate)
            .first();
        if (!attendance) {
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    date: targetDate,
                    hasCheckedIn: false,
                    hasCheckedOut: false,
                    status: 'not_attended'
                }
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                userId,
                date: targetDate,
                hasCheckedIn: !!attendance.checkInTime,
                hasCheckedOut: !!attendance.checkOutTime,
                checkInTime: attendance.checkInTime,
                checkOutTime: attendance.checkOutTime,
                workHours: attendance.dailyTotalWorkHours,
                status: attendance.checkInTime && attendance.checkOutTime ? 'completed' : 'partial'
            }
        });
    }
    catch (error) {
        console.error('Error checking attendance status:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra trạng thái chấm công',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
export const getAttendanceHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, limit = 30 } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu userId'
            });
        }
        let query = connection('time_attendances')
            .where('userId', userId)
            .orderBy('date', 'desc')
            .limit(parseInt(limit));
        if (startDate) {
            query = query.where('date', '>=', startDate);
        }
        if (endDate) {
            query = query.where('date', '<=', endDate);
        }
        const history = await query;
        return res.status(200).json({
            success: true,
            data: history,
            total: history.length
        });
    }
    catch (error) {
        console.error('Error getting attendance history:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử chấm công',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
export const getUserAttendanceByMonth = async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;
        if (!userId || !year || !month) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin userId, year hoặc month'
            });
        }
        const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
        const endDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
        console.log('📅 Fetching attendance data:', { userId, year, month, startDate, endDate });
        const attendanceRecords = await connection('time_attendances')
            .where('userId', userId)
            .whereBetween('date', [startDate, endDate])
            .orderBy('date', 'asc');
        const formattedData = attendanceRecords.map(record => {
            const checkInTime = record.checkInTime ? dayjs(record.checkInTime) : null;
            const checkOutTime = record.checkOutTime ? dayjs(record.checkOutTime) : null;
            return {
                id: record.id,
                userId: record.userId,
                date: dayjs(record.date).format('YYYY-MM-DD'),
                checkIn: checkInTime ? checkInTime.format('HH:mm') : null,
                checkOut: checkOutTime ? checkOutTime.format('HH:mm') : null,
                checkInTime: record.checkInTime,
                checkOutTime: record.checkOutTime,
                totalHours: parseFloat(record.dailyTotalWorkHours || 0),
                workHours: parseFloat(record.dailyTotalWorkHours || 0),
                lateMinutes: parseFloat(record.lateMinutes || 0),
                earlyDepartureMinutes: parseFloat(record.earlyDepartureMinutes || 0),
                status: determineAttendanceStatus(record),
                overtime: parseFloat(record.otMinutes || 0) / 60
            };
        });
        console.log(`✅ Found ${formattedData.length} attendance records for user ${userId}`);
        return res.status(200).json({
            success: true,
            data: formattedData,
            total: formattedData.length,
            period: { year: parseInt(year), month: parseInt(month) }
        });
    }
    catch (error) {
        console.error('Error fetching monthly attendance:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy dữ liệu chấm công tháng',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
export const getUserMonthlyStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;
        if (!userId || !year || !month) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin userId, year hoặc month'
            });
        }
        const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
        const lastDay = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
        const endDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
        console.log('📊 Calculating monthly stats:', { userId, year, month, startDate, endDate });
        const attendanceRecords = await connection('time_attendances')
            .where('userId', userId)
            .whereBetween('date', [startDate, endDate]);
        const totalDays = lastDay;
        const presentDays = attendanceRecords.filter(record => record.checkInTime).length;
        const absentDays = totalDays - presentDays;
        const lateDays = attendanceRecords.filter(record => parseFloat(record.lateMinutes || 0) > 0).length;
        const earlyLeaveDays = attendanceRecords.filter(record => parseFloat(record.earlyDepartureMinutes || 0) > 0).length;
        const totalHours = attendanceRecords.reduce((sum, record) => sum + parseFloat(record.dailyTotalWorkHours || 0), 0);
        const overtimeHours = attendanceRecords.reduce((sum, record) => sum + (parseFloat(record.otMinutes || 0) / 60), 0);
        const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
        const stats = {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            earlyLeaveDays,
            totalHours: Math.round(totalHours * 100) / 100,
            averageHours: Math.round(averageHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100
        };
        console.log('✅ Monthly stats calculated:', stats);
        return res.status(200).json({
            success: true,
            data: stats,
            period: { year: parseInt(year), month: parseInt(month) }
        });
    }
    catch (error) {
        console.error('Error calculating monthly stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tính toán thống kê tháng',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
function determineAttendanceStatus(record) {
    if (!record.checkInTime) {
        return 'absent';
    }
    const lateMinutes = parseFloat(record.lateMinutes || 0);
    const earlyDepartureMinutes = parseFloat(record.earlyDepartureMinutes || 0);
    if (lateMinutes > 0 && earlyDepartureMinutes > 0) {
        return 'late';
    }
    else if (lateMinutes > 0) {
        return 'late';
    }
    else if (earlyDepartureMinutes > 0) {
        return 'early_leave';
    }
    else {
        return 'on_time';
    }
}
//# sourceMappingURL=AttendanceController.js.map