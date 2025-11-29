import api from './api';

/**
 * AttendanceService - Service gọi API chấm công
 * Thiết kế giống web FE (frontend/src/service/attendanceService.ts)
 */
class AttendanceService {
  /**
   * 🚀 API TỔNG HỢP: Lấy thống kê tháng + chi tiết từng ngày trong 1 request
   * Giống hệt web FE: getUserMonthlyAttendanceFull
   * @param {number} userId - ID người dùng
   * @param {number} year - Năm
   * @param {number} month - Tháng (1-12)
   * @returns {Promise<{monthlyStats: Object, dailyData: Object} | null>}
   */
  static async getUserMonthlyAttendanceFull(userId, year, month) {
    try {
      console.log('📊 [App] Calling monthly-full API:', `/attendance/user/${userId}/monthly-full?year=${year}&month=${month}`);
      
      const response = await api.get(`/attendance/user/${userId}/monthly-full`, {
        params: { year, month }
      });
      
      console.log('📥 [App] Raw monthly-full response:', response.data);
      
      const fullData = response.data?.success ? response.data.data : null;
      console.log('✅ [App] Parsed monthly-full data:', fullData);
      
      return fullData;
    } catch (error) {
      console.error('❌ [App] Error fetching user monthly attendance full:', error);
      return null;
    }
  }

  /**
   * Lấy thống kê chấm công tháng
   * @param {number} userId - ID người dùng
   * @param {number} year - Năm
   * @param {number} month - Tháng
   */
  static async getMonthlyStats(userId, year, month) {
    try {
      const response = await api.get(`/attendance/user/${userId}/monthly`, {
        params: { year, month }
      });
      return response.data?.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      return null;
    }
  }

  /**
   * Lấy chi tiết chấm công từng ngày trong tháng
   * @param {number} userId - ID người dùng
   * @param {number} year - Năm
   * @param {number} month - Tháng
   */
  static async getDailyDetails(userId, year, month) {
    try {
      const response = await api.get(`/attendance/user/${userId}/monthly-detail`, {
        params: { year, month }
      });
      return response.data?.success ? response.data.data : null;
    } catch (error) {
      console.error('Error fetching daily details:', error);
      return null;
    }
  }

  /**
   * Duyệt bảng chấm công (cho manager)
   * Giống web FE: approveAttendance
   * @param {Object} approvalData - Dữ liệu duyệt
   */
  static async approveAttendance(approvalData) {
    try {
      const response = await api.post('/attendance/approve', approvalData);
      
      if (response.data?.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Lỗi khi duyệt bảng chấm công');
    } catch (error) {
      console.error('Error approving attendance:', error);
      throw error;
    }
  }

  /**
   * Submit chấm công (check-in/check-out)
   * @param {string} imageBase64 - Ảnh base64
   */
  static async submitAttendance(imageBase64) {
    try {
      const response = await api.post('/attendance/check-in', {
        image: imageBase64,
      });
      return response.data;
    } catch (error) {
      console.error('Attendance submit error:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch sử chấm công
   */
  static async getHistory() {
    try {
      const response = await api.get('/attendance/history');
      return response.data;
    } catch (error) {
      console.error('Get history error:', error);
      throw error;
    }
  }

  /**
   * Helper: Normalize monthlyStats từ response API
   * Giống web FE
   */
  static normalizeMonthlyStats(stats) {
    if (!stats) return null;
    
    return {
      totalDays: stats.totalDays ?? stats.totalScheduledDays ?? 0,
      presentDays: stats.presentDays ?? 0,
      absentDays: stats.absentDays ?? 0,
      lateDays: stats.lateDays ?? 0,
      earlyLeaveDays: stats.earlyLeaveDays ?? 0,
      totalHours: stats.totalHours ?? stats.totalWorkHours ?? 0,
      averageHours: stats.averageHours ?? stats.averageWorkHours ?? 0,
      overtimeHours: stats.overtimeHours ?? stats.totalOvertimeHours ?? 0,
      totalLatePenalty: stats.totalLatePenalty ?? 0,
      totalEarlyLeavePenalty: stats.totalEarlyLeavePenalty ?? 0,
      totalPenalty: stats.totalPenalty ?? 0,
      totalOvertimePay: stats.totalOvertimePay ?? stats.totalOvertimeSalary ?? 0,
      totalWorkingUnits: stats.totalWorkingUnits ?? 0,
      totalOtWorkingUnits: stats.totalOtWorkingUnits ?? 0,
      totalLateMinutes: stats.totalLateMinutes ?? 0,
      totalEarlyLeaveMinutes: stats.totalEarlyLeaveMinutes ?? 0,
      unauthorizedAbsenceDays: stats.unauthorizedAbsenceDays ?? 0,
      unauthorizedAbsencePenaltyPerDay: stats.unauthorizedAbsencePenaltyPerDay ?? 0,
      totalUnauthorizedAbsencePenalty: stats.totalUnauthorizedAbsencePenalty ?? 0,
      approvedLeaveDays: stats.approvedLeaveDays ?? 0,
      businessTripDays: stats.businessTripDays ?? 0
    };
  }
}

export default AttendanceService;
