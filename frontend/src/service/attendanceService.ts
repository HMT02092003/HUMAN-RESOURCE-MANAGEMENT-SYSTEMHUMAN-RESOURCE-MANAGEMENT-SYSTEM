import { apiService } from './apiService';

export interface AttendanceData {
  id: number;
  userId: number;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'on_time' | 'late' | 'early_leave' | 'absent';
  totalHours: number;
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
}

class AttendanceService {
  // Lấy dữ liệu chấm công của user trong tháng
  async getUserAttendanceByMonth(userId: number, year: number, month: number): Promise<AttendanceData[]> {
    try {
      const response = await apiService.get(`/api/attendance/user/${userId}/month`, {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user attendance:', error);
      return [];
    }
  }

  // Lấy thống kê chấm công của user trong tháng
  async getUserMonthlyStats(userId: number, year: number, month: number): Promise<MonthlyStats> {
    try {
      const response = await apiService.get(`/api/attendance/user/${userId}/stats`, {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user monthly stats:', error);
      return {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        earlyLeaveDays: 0,
        totalHours: 0,
        averageHours: 0,
        overtimeHours: 0
      };
    }
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
