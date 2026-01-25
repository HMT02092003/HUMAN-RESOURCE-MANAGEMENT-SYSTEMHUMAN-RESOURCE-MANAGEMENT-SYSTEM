import api from './api';

class AttendanceAPI {
  static async submitAttendance(userId, timestamp = new Date().toISOString()) {
    try {
      // Gọi API record mới của attendance-service
      // Gateway: /api/attendance/record -> attendance-service/api/record
      const response = await api.post('/attendance/record', {
        userId: userId,
        time: timestamp
      });

      return response.data;
    } catch (error) {
      console.error('Attendance API error:', error);
      throw error;
    }
  }

  static async getHistory() {
    try {
      const response = await api.get('/attendance/history');
      return response.data;
    } catch (error) {
      console.error('Get history error:', error);
      throw error;
    }
  }
}

export default AttendanceAPI;
