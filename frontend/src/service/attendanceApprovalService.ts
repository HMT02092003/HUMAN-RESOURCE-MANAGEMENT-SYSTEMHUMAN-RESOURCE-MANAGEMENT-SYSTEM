import api from './apiService';

export interface AttendanceForApproval {
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    departmentId: number;
    department: {
      id: number;
      name: string;
    };
  };
  month: string;
  totalWorkDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalLateDays: number;
  totalEarlyLeaveDays: number;
  totalPenalty: number;
  totalOvertimeSalary: number;
  isApproved: boolean;
  attendanceData: any[];
}

export interface ApprovalRequest {
  userId: number;
  month: string;
  departmentId: number;
  notes?: string;
}

export interface ApprovedAttendanceData {
  attendanceData: any[];
  summary: {
    totalWorkDays: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
    totalLateDays: number;
    totalEarlyLeaveDays: number;
    totalPenalty: number;
    totalOvertimeSalary: number;
  };
}

class AttendanceApprovalService {
  
  /**
   * Lấy danh sách chấm công cần duyệt theo phòng ban và tháng
   * @param departmentId ID phòng ban
   * @param month Tháng (YYYY-MM)
   * @returns Danh sách nhân viên với thông tin chấm công
   */
  async getAttendanceForApproval(departmentId: number, month: string): Promise<AttendanceForApproval[]> {
    try {
      const response = await api.get('/api/attendance/approval', {
        params: {
          departmentId,
          month
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể lấy danh sách chấm công');
      }
    } catch (error: any) {
      console.error('Error getting attendance for approval:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy danh sách chấm công cần duyệt');
    }
  }

  /**
   * Duyệt chấm công cho một nhân viên
   * @param approvalData Thông tin duyệt
   * @returns Kết quả duyệt
   */
  async approveAttendance(approvalData: ApprovalRequest): Promise<any> {
    try {
      const response = await api.post('/api/attendance/approve', approvalData);

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

  /**
   * Lấy dữ liệu chấm công đã duyệt của một nhân viên
   * @param userId ID nhân viên
   * @param month Tháng (YYYY-MM)
   * @returns Dữ liệu chấm công đã duyệt
   */
  async getApprovedAttendance(userId: number, month: string): Promise<ApprovedAttendanceData> {
    try {
      const response = await api.get('/api/attendance/approved', {
        params: {
          userId,
          month
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Không thể lấy dữ liệu chấm công đã duyệt');
      }
    } catch (error: any) {
      console.error('Error getting approved attendance:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy dữ liệu chấm công đã duyệt');
    }
  }

  /**
   * Kiểm tra trạng thái duyệt chấm công
   * @param userId ID nhân viên
   * @param month Tháng (YYYY-MM)
   * @returns Trạng thái duyệt
   */
  async getApprovalStatus(userId: number, month: string): Promise<boolean> {
    try {
      const response = await api.get('/api/attendance/approval-status', {
        params: {
          userId,
          month
        }
      });

      if (response.data.success) {
        return response.data.data.isApproved;
      } else {
        throw new Error(response.data.message || 'Không thể kiểm tra trạng thái duyệt');
      }
    } catch (error: any) {
      console.error('Error checking approval status:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi kiểm tra trạng thái duyệt');
    }
  }

  /**
   * Lấy danh sách tháng có thể duyệt (các tháng trong năm hiện tại)
   * @returns Danh sách tháng
   */
  getAvailableMonths(): Array<{value: string, label: string}> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const months = [];

    for (let i = 1; i <= currentMonth; i++) {
      const monthValue = `${currentYear}-${i.toString().padStart(2, '0')}`;
      const monthLabel = `Tháng ${i}/${currentYear}`;
      months.push({ value: monthValue, label: monthLabel });
    }

    return months.reverse(); // Tháng gần nhất trước
  }

  /**
   * Format số tiền VND
   * @param amount Số tiền
   * @returns Chuỗi định dạng tiền tệ
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  /**
   * Format số giờ
   * @param hours Số giờ
   * @returns Chuỗi định dạng giờ
   */
  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}p` : `${h}h`;
  }

  /**
   * Tính phần trăm hiệu suất
   * @param actualDays Số ngày làm việc thực tế
   * @param expectedDays Số ngày làm việc dự kiến
   * @returns Phần trăm hiệu suất
   */
  calculateEfficiencyRate(actualDays: number, expectedDays: number): number {
    if (expectedDays === 0) return 0;
    return Math.round((actualDays / expectedDays) * 100);
  }

  /**
   * Lấy màu sắc theo hiệu suất
   * @param rate Tỷ lệ hiệu suất
   * @returns Màu sắc
   */
  getEfficiencyColor(rate: number): string {
    if (rate >= 95) return '#52c41a'; // Xanh lá
    if (rate >= 85) return '#faad14'; // Vàng
    if (rate >= 70) return '#fa8c16'; // Cam
    return '#f5222d'; // Đỏ
  }
}

export default new AttendanceApprovalService();
