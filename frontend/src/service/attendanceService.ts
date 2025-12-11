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
  totalOtWorkingUnits?: number;  // Tổng công OT (chưa nhân hệ số)
  totalEffectiveOtWorkingUnits?: number; // Tổng công OT đã nhân hệ số (1.5x/3x)
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

export interface HolidayData {
  isHoliday: boolean;
  holidayName: string | null;
  isPublicHoliday: boolean;
}

export interface LeaveData {
  hasApprovedLeave: boolean;
  leaveType: string;
  leaveInfo: string;
  leaveTypeName?: string;
  // Full application object(s) attached by backend
  leave?: any;
  leaveApplications?: any[];
  // Convenience: applicationCategory if backend provides it at top-level
  applicationCategory?: string;
}

export interface BusinessTripData {
  hasBusinessTrip: boolean;
  businessTripInfo: string;
  businessTripDestination: string;
  reason?: string;
  // Full application object(s) attached by backend
  businessTrip?: any;
  businessTripApplications?: any[];
  applicationCategory?: string;
}

export interface DailyAttendanceDetail {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isWorkingDay: boolean;
  hasAttendance: boolean;
  // ✨ New structured data objects
  attendanceData?: AttendanceData;
  holidayData?: HolidayData;
  leaveData?: LeaveData;
  businessTripData?: BusinessTripData;
  // Core status fields
  status: 'working' | 'absent' | 'approved_leave' | 'business_trip' | 'weekend' | 'holiday';
  statusText: string;
  unauthorizedAbsencePenalty: number;
  isOnTime: boolean;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
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

  async approveMonthlyAttendance(ids: number[]): Promise<{ updated: number }> {
    try {
      const response = await apiService.post('/api/attendance/approve-monthly', { ids });
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể duyệt chấm công tháng');
      }
    } catch (error: any) {
      console.error('Error approving monthly attendance:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi duyệt chấm công tháng');
    }
  }

  async getAllMonthlyAttendance(params: any): Promise<{ results: any[]; total: number }> {
    try {
      const response = await apiService.get('/api/attendance/approve-monthly', { params });  
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể lấy danh sách chấm công tháng');
      }
    } catch (error: any) {
      console.error('Error fetching all monthly attendance:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy danh sách chấm công tháng');
    }
  }

  // Fetch monthly summaries filtered by scope with server-side filtering/sorting
  async getMonthlySummariesByScope(params: { 
    permissionKey?: string; 
    page?: number; 
    pageSize?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    [key: string]: any; // Allow dynamic filter fields
  }) {
    try {
      const response = await apiService.get('/api/attendance/monthly-summaries-by-scope', { params });
      // Backend returns {success, results, total, page, pageSize} directly, not nested in .data
      if (response.data.success) return response.data as { results: any[]; total: number; page: number; pageSize: number };
      throw new Error(response.data.message || 'Không thể lấy dữ liệu');
    } catch (error: any) {
      console.error('Error fetching monthly summaries by scope:', error);
      throw new Error(error.response?.data?.message || error.message || 'Lỗi khi lấy dữ liệu');
    }
  }

  // Generate payslip for a user from their profile (calls salary-service)
  async generatePayslipFromProfile(userId: number, year: number, month: number) {
    try {
    // send empty object instead of `null` so axios doesn't serialize to the literal JSON "null"
    const response = await apiService.post(`/api/salary/payslips/generate-from-profile/${userId}`, {}, { params: { year, month } });
      if (response.data && (response.status === 201 || response.data)) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Không thể tạo bảng lương');
    } catch (error: any) {
      console.error('Error generating payslip:', error);
      throw new Error(error.response?.data?.message || error.message || 'Lỗi khi tạo bảng lương');
    }
  }

  // Get all settings from attendance-service
  async getSettings(): Promise<any> {
    try {
      const response = await apiService.get('/api/attendance/settings');
      return response.data; // Array of { key, name, value }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      throw new Error(error.response?.data?.message || error.message || 'Lỗi khi lấy settings');
    }
  }

  // Get specific setting by key
  async getSettingByKey(key: string): Promise<any> {
    try {
      const response = await apiService.get(`/api/attendance/settings/${key}`);
      return response.data; // { key, name, value }
    } catch (error: any) {
      console.error('Error fetching setting by key:', error);
      throw new Error(error.response?.data?.message || error.message || 'Lỗi khi lấy setting');
    }
  }
}

export const attendanceService = new AttendanceService();
