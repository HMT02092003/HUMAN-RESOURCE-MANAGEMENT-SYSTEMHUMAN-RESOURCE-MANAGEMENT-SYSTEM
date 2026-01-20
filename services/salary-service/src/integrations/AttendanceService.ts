import axios from 'axios';

const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://127.0.0.1:4003';

class AttendanceService {
  /**
   * Get monthly attendance by month for all users
   */
  static async getMonthlyAttendanceByMonth(year: number, month: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }
      // Attendance service expects a 'month' query param in YYYY-MM format
      const monthStr = `${String(year)}-${String(month).padStart(2, '0')}`;
      const response = await axios.get(
        `${ATTENDANCE_SERVICE_URL}/api/attendance/monthly-attendance/by-month`,
        { headers, params: { month: monthStr }, timeout: 10000 }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AttendanceService] Failed to get monthly attendance:`, error.message);
      throw error;
    }
  }

  /**
   * Get user monthly full attendance data
   */
  static async getUserMonthlyFull(userId: number, year: number, month: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      const response = await axios.get(
        `${ATTENDANCE_SERVICE_URL}/api/user/${userId}/monthly-full`,
        { headers, params: { year, month } }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AttendanceService] Failed to get user monthly full:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate standard working days
   */
  static async calculateStandardWorkingDays(year: number, month: number, authToken?: string, userData?: any): Promise<any> {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = authToken;
      if (userData) {
        headers['x-user-data'] = Buffer.from(JSON.stringify(userData)).toString('base64');
        headers['x-user-id'] = String(userData.sub || userData.user?.id || userData.id);
      }

      // Route is mounted at /api and the endpoint path is '/calculate-standard-working-days'
      const response = await axios.post(
        `${ATTENDANCE_SERVICE_URL}/api/calculate-standard-working-days`,
        { year, month: `${String(year)}-${String(month).padStart(2, '0')}` },
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error(`❌ [AttendanceService] Failed to calculate standard working days:`, error.message);
      throw error;
    }
  }
}

export default AttendanceService;
