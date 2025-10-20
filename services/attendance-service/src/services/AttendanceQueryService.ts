import dayjs from 'dayjs';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import axios from 'axios';
import { getWorkingDaysConfig as helpersGetWorkingDaysConfig, isWorkingDay as helpersIsWorkingDay, checkDateHasLeave as helpersCheckDateHasLeave, checkDateHasBusinessTrip as helpersCheckDateHasBusinessTrip } from './AttendanceHelpers';

interface ApprovedLeaveApplication {
  id: number;
  type: string;
  userId: number;
  status: string;
  data: any;
  applicationDate: string;
  approvedDate: string;
}

export async function calculateTotalLateDays(userId: number, month: string): Promise<number> {
  try {
    const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

    const result = await TimeAttendanceModel.query()
      .where('userId', userId)
      .whereBetween('date', [startDate, endDate])
      .where('lateMinutes', '>', 0)
      .count('* as count')
      .first() as any;

    const count = result ? parseInt(result.count as string) : 0;
    return count;
  } catch (error) {
    console.error('❌ Error calculating late days:', error);
    return 0;
  }
}

export async function calculateTotalEarlyLeaveDays(userId: number, month: string): Promise<number> {
  try {
    const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

    const result = await TimeAttendanceModel.query()
      .where('userId', userId)
      .whereBetween('date', [startDate, endDate])
      .where('earlyDepartureMinutes', '>', 0)
      .count('* as count')
      .first() as any;

    const count = result ? parseInt(result.count as string) : 0;
    return count;
  } catch (error) {
    console.error('❌ Error calculating early leave days:', error);
    return 0;
  }
}

export async function getUserMonthlyAttendance(userId: number, month: string, token?: string): Promise<any | null> {
  try {
    const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

    const monthlyRecord = await MonthlySummaryModel.getByUserAndMonth(userId, month);
    if (monthlyRecord) {
      const rawAttendanceRows = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate])
        .orderBy('date', 'asc');

      const attendancePlain = rawAttendanceRows.map((r: any) => (r.toJSON ? r.toJSON() : { ...r }));

      return {
        userId,
        user: {
          id: userId,
          name: 'N/A',
          email: 'N/A',
          departmentId: monthlyRecord.departmentId || 0,
          department: { id: monthlyRecord.departmentId || 0, name: 'N/A' }
        },
  month,
  presentDays: parseFloat((monthlyRecord.presentDays ?? 0).toString()) || 0,
        totalWorkHours: parseFloat((monthlyRecord.totalWorkHours ?? 0).toString()) || 0,
        totalOvertimeHours: parseFloat((monthlyRecord.totalOvertimeHours ?? 0).toString()) || 0,
  totalLateDays: parseFloat((monthlyRecord.lateDays ?? 0).toString()) || 0,
    totalEarlyLeaveDays: parseFloat((monthlyRecord.earlyLeaveDays ?? 0).toString()) || 0,
        totalPenalty: parseFloat((monthlyRecord.totalPenalty ?? 0).toString()) || 0,
        totalOvertimeSalary: parseFloat((monthlyRecord.totalOvertimeSalary ?? 0).toString()) || 0,
        isApproved: true,
        attendanceData: attendancePlain
      };
    }

    const attendanceData = await TimeAttendanceModel.query()
      .where('userId', userId)
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    const workingDaysConfig = await helpersGetWorkingDaysConfig();

    const [year, monthNum] = month.split('-');
    const approvedApplications: ApprovedLeaveApplication[] = [];
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const appResp = await axios.get(`${process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004'}/api/applications/user/${userId}/approved`, { params: { year: parseInt(year || ''), month: parseInt(monthNum || '') }, headers });
      approvedApplications.push(...(appResp.data.data || []));
    } catch (e) {
      // ignore
    }

    const attendanceMap = new Map<string, any>();
    attendanceData.forEach((record: any) => {
      const dateKey = dayjs(record.date).format('YYYY-MM-DD');
      const plainRecord = record.toJSON ? record.toJSON() : { ...record };
      attendanceMap.set(dateKey, plainRecord);
    });

    const daysInMonth = dayjs(`${month}-01`).daysInMonth();
    const enrichedAttendanceData: any[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = dayjs(`${month}-${String(day).padStart(2, '0')}`);
      const dateKey = currentDate.format('YYYY-MM-DD');

      const isWork = helpersIsWorkingDay(dateKey, workingDaysConfig);
      const isFuture = currentDate.isAfter(dayjs(), 'day');
      const attendanceRecord = attendanceMap.get(dateKey);
      const leaveCheck = helpersCheckDateHasLeave(dateKey, approvedApplications as any);
      const businessTripCheck = helpersCheckDateHasBusinessTrip(dateKey, approvedApplications as any);

      const hasApprovedOT = approvedApplications.some(app => {
        if (app.type !== 'overtime') return false;
        const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
        return appData.date === dateKey;
      });

      const dayRecord: any = {
        date: currentDate.toISOString(),
        userId,
        isWorkingDay: isWork,
        isFuture,
        hasApprovedOT,
        hasApprovedLeave: leaveCheck.hasLeave,
        leaveType: leaveCheck.leaveType,
        leaveInfo: leaveCheck.leaveInfo,
        type: leaveCheck.hasLeave ? leaveCheck.leaveType : (businessTripCheck.hasBusinessTrip ? 'business_trip' : 'attendance'),
        hasBusinessTrip: businessTripCheck.hasBusinessTrip,
        businessTripInfo: businessTripCheck.tripInfo,
        businessTripDestination: businessTripCheck.destination,
        tripInfo: businessTripCheck.tripInfo,
        destination: businessTripCheck.destination
      };

      if (attendanceRecord) {
        Object.assign(dayRecord, { ...attendanceRecord, date: currentDate.toISOString(), userId, isWorkingDay: isWork, isFuture, hasApprovedOT, hasApprovedLeave: leaveCheck.hasLeave, leaveType: leaveCheck.leaveType, leaveInfo: leaveCheck.leaveInfo, type: leaveCheck.hasLeave ? leaveCheck.leaveType : (businessTripCheck.hasBusinessTrip ? 'business_trip' : 'attendance'), hasBusinessTrip: businessTripCheck.hasBusinessTrip, businessTripInfo: businessTripCheck.tripInfo, businessTripDestination: businessTripCheck.destination, tripInfo: businessTripCheck.tripInfo, destination: businessTripCheck.destination });
      } else {
        dayRecord.id = null;
        dayRecord.checkInTime = null;
        dayRecord.checkOutTime = null;
        dayRecord.lateMinutes = 0;
        dayRecord.earlyDepartureMinutes = 0;
        dayRecord.dailyTotalWorkHours = 0;
        dayRecord.lateArrivalPenalty = 0;
        dayRecord.earlyLeavePenalty = 0;
        dayRecord.otMinutes = 0;
        dayRecord.otSalary = 0;
      }

      enrichedAttendanceData.push(dayRecord);
    }

    const isApproved = await MonthlySummaryModel.isApproved(userId, month);

    const totalLateDays = await calculateTotalLateDays(userId, month);
    const totalEarlyLeaveDays = await calculateTotalEarlyLeaveDays(userId, month);

    let totalWorkDays = 0;
    let totalWorkHours = 0;
    let totalOvertimeMinutes = 0;
    let totalPenalty = 0;
    let totalOvertimeSalary = 0;

    enrichedAttendanceData.forEach(record => {
      if (record.checkInTime && record.checkOutTime) {
        totalWorkDays++;
        totalWorkHours += parseFloat(record.dailyTotalWorkHours.toString());
        totalOvertimeMinutes += parseFloat(record.otMinutes.toString());
        totalPenalty += parseFloat(record.lateArrivalPenalty.toString()) + parseFloat(record.earlyLeavePenalty.toString());
        totalOvertimeSalary += parseFloat(record.otSalary.toString());
      }
    });

    return {
      userId,
      user: { id: userId, name: 'N/A', email: 'N/A', departmentId: 0, department: { id: 0, name: 'N/A' } },
      month,
      presentDays: totalWorkDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 100) / 100,
      totalLateDays,
      totalEarlyLeaveDays,
      totalPenalty: Math.round(totalPenalty * 100) / 100,
      totalOvertimeSalary: Math.round(totalOvertimeSalary * 100) / 100,
      isApproved,
      attendanceData: enrichedAttendanceData
    };
  } catch (error) {
    console.error('❌ Error getting user monthly attendance:', error);
    return null;
  }
}

export async function getApprovedOvertimeApplication(userId: number, date: string): Promise<any | null> {
  try {
    const response = await axios.get(`${process.env['APPLICATION_SERVICE_URL'] || 'http://localhost:4004'}/api/applications/user/${userId}/approved`, { params: { year: dayjs(date).year(), month: dayjs(date).month() + 1 } });
    const applications = response.data.data || [];
    const overtimeApp = applications.find((app: any) => {
      if (app.type !== 'overtime') return false;
      const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
      return appData.date === date;
    });
    return overtimeApp || null;
  } catch (error: any) {
    console.error('Error fetching overtime applications:', error?.message || error);
    return null;
  }
}
