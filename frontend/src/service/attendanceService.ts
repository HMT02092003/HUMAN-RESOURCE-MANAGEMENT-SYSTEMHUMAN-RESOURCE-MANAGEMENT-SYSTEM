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
  totalOvertimePay?: number;     // Tổng tiền overtime (VND) - API may use this name
  // Additional optional fields that may come from `monthly_attendances`
  totalOvertimeSalary?: number;  // alternative column name used in DB
  totalWorkingUnits?: number;    // Tổng số công trong tháng
  totalOvertimeHours?: number;   // Tổng giờ OT
  totalOtWorkingUnits?: number;  // Tổng công OT
  totalLateMinutes?: number;
  totalEarlyLeaveMinutes?: number;
  unauthorizedAbsenceDays?: number;
  unauthorizedAbsencePenaltyPerDay: number;
  totalUnauthorizedAbsencePenalty?: number;
  approvedLeaveDays?: number;
  businessTripDays?: number;
  // Alternate DB column names
  totalScheduledDays?: number;
  totalWorkHours?: number;
  averageWorkHours?: number;
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
  // 🚀 API TỔNG HỢP: Lấy thống kê tháng + chi tiết từng ngày trong 1 request
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

  // Duyệt bảng chấm công (gộp từ attendanceApprovalService)
  async approveAttendance(approvalData: any): Promise<any> {
    try {
      const response = await apiService.post('/api/attendance/approve', approvalData);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể duyệt chấm công');
      }
    } catch (error: any) {
      console.error('Error approving attendance:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi duyệt chấm công');
    }
  }
}

export const attendanceService = new AttendanceService();
