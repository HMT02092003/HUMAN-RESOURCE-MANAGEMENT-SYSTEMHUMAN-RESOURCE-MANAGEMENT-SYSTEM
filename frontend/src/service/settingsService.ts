import { get } from 'lodash';
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
        PenaltyRate: { rate: 0.001 },
        UnauthorizedAbsencePenaltyRate: { rate: 5 },
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

  // Cập nhật settings theo từng loại
  updateSetting: async (key: string, value: any) => {
    try {
      const data = { key, value };
  // Use dedicated per-key endpoint
  const response = await api.post('/api/attendance/settings/key', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Thêm: Fetch setting theo key (cho revert)
  getSettingByKey: async (key: string) => {
    try {
      const response = await api.get(`/api/attendance/settings/${key}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching setting by key:', error);
      throw error;
    }
  },

  // Convenience methods for dedicated routes
  updateWorkingHours: async (value: any) => {
    const response = await api.post('/api/attendance/settings/working-hours', { value });
    return response.data;
  },
  updateLunchBreak: async (value: any) => {
    const response = await api.post('/api/attendance/settings/lunch-break', { value });
    return response.data;
  },
  updateOvertimeRate: async (value: any) => {
    const response = await api.post('/api/attendance/settings/overtime-rate', { value });
    return response.data;
  },
  updateHolidayRate: async (value: any) => {
    const response = await api.post('/api/attendance/settings/holiday-rate', { value });
    return response.data;
  },
  updatePenaltyRate: async (value: any) => {
    const response = await api.post('/api/attendance/settings/penalty-rate', { value });
    return response.data;
  },
  updateUnauthorizedAbsencePenaltyRate: async (value: any) => {
    const response = await api.post('/api/attendance/settings/unauthorized-absence-penalty-rate', { value });
    return response.data;
  },
  updateWorkingDays: async (value: any) => {
    const response = await api.post('/api/attendance/settings/working-days', { value });
    return response.data;
  },

  getWorkingDays: async (key: any) => {
    try {
      const response = await api.get(`/api/attendance/settings/${key}`);
      return response.data;
    } catch (error) {
      console.error('Error getting working days:', error);
    }
  }

};

export default SettingsService;