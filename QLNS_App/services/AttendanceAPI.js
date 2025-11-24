import api from './api';

class AttendanceAPI {
  static async submitAttendance(imageBase64) {
    try {
      const response = await api.post('/attendance/check-in', {
        image: imageBase64,
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
