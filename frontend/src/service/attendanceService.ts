import apiService from './apiService';

export interface AttendanceData {
  id: number;
  userId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'on_time' | 'late' | 'early_leave' | 'absent';
  totalHours: number;
  workHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  lateArrivalPenalty: number; // Tiền phạt đi muộn (VND)
  earlyLeavePenalty: number;  // Tiền phạt về sớm (VND)
  overtime: number;
}

export interface MonthlyStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  totalHours: number;
  averageHours: number;
  overtimeHours: number;
  totalLatePenalty: number;      // Tổng tiền phạt đi muộn (VND)
  totalEarlyLeavePenalty: number; // Tổng tiền phạt về sớm (VND)
  totalPenalty: number;          // Tổng tiền phạt (VND)
  totalOvertimePay?: number;     // Tổng tiền overtime (VND)
}

export interface DailyAttendanceDetail {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  hasAttendance: boolean;
  attendanceData?: AttendanceData;
  hasApprovedLeave: boolean;
  leaveType?: string;
  status: 'working' | 'absent' | 'approved_leave' | 'business_trip' | 'weekend' | 'holiday';
  statusText: string;
  unauthorizedAbsencePenalty: number;
  isOnTime: boolean;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  businessTripInfo?: string;
  businessTripDestination?: string;
  leaveInfo?: string; // Thông tin lý do nghỉ phép
}

export interface MonthlyAttendanceDetailResponse {
  userId: number;
  year: number;
  month: number;
  monthlySalary: number;
  penaltyRate: number;
  dailyDetails: DailyAttendanceDetail[];
  summary: {
    totalDays: number;
    workingDays: number;
    attendedDays: number;
    approvedLeaveDays: number;
    unauthorizedAbsenceDays: number;
    totalUnauthorizedAbsencePenalty: number;
    weekendDays: number;
    totalLateMinutes: number;
    totalEarlyLeaveMinutes: number;
    onTimeDays: number;
  };
}

class AttendanceService {
  // Lấy dữ liệu chấm công của user trong tháng
  async getUserAttendanceByMonth(userId: number, year: number, month: number): Promise<AttendanceData[]> {
    try {
      console.log('🔄 Calling attendance API:', `/api/attendance/user/${userId}/month?year=${year}&month=${month}`);
      const response = await apiService.get(`/api/attendance/user/${userId}/month`, {
        params: { year, month }
      });
      console.log('📥 Raw API response:', response.data);
      
      // API trả về {success: true, data: [...]} nên cần lấy response.data.data
      const attendanceData = response.data.success ? response.data.data : [];
      console.log('✅ Parsed attendance data:', attendanceData);
      
      return attendanceData;
    } catch (error) {
      console.error('❌ Error fetching user attendance:', error);
      return [];
    }
  }

  // Lấy chi tiết chấm công theo tháng (bao gồm nghỉ không phép + penalty)
  async getUserMonthlyAttendanceDetail(userId: number, year: number, month: number): Promise<MonthlyAttendanceDetailResponse | null> {
    try {
      const response = await apiService.get(`/api/attendance/user/${userId}/monthly-detail`, {
        params: { year, month }
      });
      
      const detailData = response.data.success ? response.data.data : null;
      
      return detailData;
    } catch (error) {
      return null;
    }
  }

  // Lấy thống kê chấm công của user trong tháng từ API mới
  async getUserMonthlyStats(userId: number, year: number, month: number): Promise<MonthlyStats> {
    try {
      console.log('📊 Calling monthly stats API:', `/api/attendance/user/${userId}/stats/monthly?year=${year}&month=${month}`);
      const response = await apiService.get(`/api/attendance/user/${userId}/stats/monthly`, {
        params: { year, month }
      });
      console.log('📥 Raw monthly stats response:', response.data);
      
      // API trả về {success: true, data: {...}} nên cần lấy response.data.data
      const statsData = response.data.success ? response.data.data : {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        earlyLeaveDays: 0,
        totalHours: 0,
        averageHours: 0,
        overtimeHours: 0,
        totalLatePenalty: 0,
        totalEarlyLeavePenalty: 0,
        totalPenalty: 0
      };
      console.log('✅ Parsed monthly stats data:', statsData);
      
      return statsData;
    } catch (error) {
      console.error('❌ Error fetching user monthly stats:', error);
      return {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        earlyLeaveDays: 0,
        totalHours: 0,
        averageHours: 0,
        overtimeHours: 0,
        totalLatePenalty: 0,
        totalEarlyLeavePenalty: 0,
        totalPenalty: 0
      };
    }
  }

  // 🚀 API TỔNG HỢP: Lấy thống kê tháng + chi tiết từng ngày trong 1 request
  // Thay thế cho getUserMonthlyStats() + getUserMonthlyAttendanceDetail()
  async getUserMonthlyAttendanceFull(userId: number, year: number, month: number): Promise<{
    monthlyStats: MonthlyStats;
    dailyData: MonthlyAttendanceDetailResponse;
  } | null> {
    try {
      console.log('📊 Calling monthly-full API:', `/api/attendance/user/${userId}/monthly-full?year=${year}&month=${month}`);
      const response = await apiService.get(`/api/attendance/user/${userId}/monthly-full`, {
        params: { year, month }
      });
      console.log('📥 Raw monthly-full response:', response.data);
      
      const fullData = response.data.success ? response.data.data : null;
      console.log('✅ Parsed monthly-full data:', fullData);
      
      return fullData;
    } catch (error) {
      console.error('❌ Error fetching user monthly attendance full:', error);
      return null;
    }
  }

  // Tính tổng penalty từ attendance data
  calculatePenaltyFromAttendanceData(attendanceData: AttendanceData[]): {
    totalLatePenalty: number;
    totalEarlyLeavePenalty: number;
    totalPenalty: number;
  } {
    const totalLatePenalty = attendanceData.reduce((sum, item) => sum + (item.lateArrivalPenalty || 0), 0);
    const totalEarlyLeavePenalty = attendanceData.reduce((sum, item) => sum + (item.earlyLeavePenalty || 0), 0);
    
    return {
      totalLatePenalty,
      totalEarlyLeavePenalty,
      totalPenalty: totalLatePenalty + totalEarlyLeavePenalty
    };
  }

  // Lấy dữ liệu chấm công theo ngày
  async getUserAttendanceByDate(userId: number, date: string): Promise<AttendanceData | null> {
    try {
      const response = await apiService.get(`/api/attendance/user/${userId}/date`, {
        params: { date }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user attendance by date:', error);
      return null;
    }
  }

  // Chấm công vào
  async checkIn(userId: number, data: { time: string; location?: string }): Promise<any> {
    try {
      const response = await apiService.post(`/api/attendance/checkin`, {
        userId,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  // Chấm công ra
  async checkOut(userId: number, data: { time: string; location?: string }): Promise<any> {
    try {
      const response = await apiService.post(`/api/attendance/checkout`, {
        userId,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('Error checking out:', error);
      throw error;
    }
  }

  // Lấy dữ liệu chấm công của tất cả users (cho admin)
  async getAllUsersAttendance(year: number, month: number, departmentId?: number): Promise<any[]> {
    try {
      const params: any = { year, month };
      if (departmentId) {
        params.departmentId = departmentId;
      }
      
      const response = await apiService.get('/api/attendance/all', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all users attendance:', error);
      return [];
    }
  }
}

export const attendanceService = new AttendanceService();
