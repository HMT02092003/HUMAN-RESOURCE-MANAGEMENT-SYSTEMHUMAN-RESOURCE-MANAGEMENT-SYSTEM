import api from './apiService';

const SettingsService = {
  // Lấy cấu hình settings
  getAllSettings: async () => {
    try {
      const response = await api.get('/api/attendance/settings');
      return response.data; 
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Trả về cấu hình mặc định nếu có lỗi
      return {
        WorkingHours: { start: '08:00', end: '17:00' },
        LunchBreak: { start: '12:00', end: '13:00' },
        OvertimeRate: { rate: 1.5 },
        HolidayRate: { rate: 3.0 },
        WorkingDays: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        }
      };
    }
  },

  // Cập nhật settings
  updateSettings: async (data: any) => {
    try {
      const response = await api.post('/api/attendance/settings', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

};

export default SettingsService; 