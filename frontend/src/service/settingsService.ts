import { get } from 'lodash';
import api from './apiService';

const SettingsService = {
  // Lấy cấu hình settings
  getAllSettings: async () => {
    try {
      // Fetch attendance-related settings from attendance-service
      const [attResp, salResp] = await Promise.allSettled([
        api.get('/api/attendance/settings'),
        api.get('/api/salary/settings')
      ]);

      const attendanceData = attResp.status === 'fulfilled' ? attResp.value.data : null;
      const salaryData = salResp.status === 'fulfilled' ? salResp.value.data : null;

      // Merge: attendance keys take precedence for attendance-related items
      const merged = { ...salaryData };
      if (attendanceData && Array.isArray(attendanceData)) {
        // attendance service returns array of settings -> convert to object
        attendanceData.forEach((s: any) => {
          try {
            merged[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch { merged[s.key] = s.value; }
        });
      }

      // salaryData may also be array
      if (salaryData && Array.isArray(salaryData)) {
        salaryData.forEach((s: any) => {
          if (merged[s.key] === undefined) {
            try { merged[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value; } catch { merged[s.key] = s.value; }
          }
        });
      }

      return merged;
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
      // Route per-key: attendance-related keys -> attendance-service, salary-related keys -> salary-service
      const attendanceKeys = ['WorkingHours', 'LunchBreak', 'WorkingDays'];
      const salaryKeys = ['OvertimeRate', 'HolidayRate', 'PenaltyRate', 'UnauthorizedAbsencePenaltyRate', 'BHXH', 'BHYT', 'TNCN'];

      if (attendanceKeys.includes(key)) {
        const response = await api.post('/api/attendance/settings/key', data);
        return response.data;
      } else {
        const response = await api.post('/api/salary/settings/key', data);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  },

  // Thêm: Fetch setting theo key (cho revert)
  getSettingByKey: async (key: string) => {
    try {
      // prefer attendance for attendance-related keys
      const attendanceKeys = ['WorkingHours', 'LunchBreak', 'WorkingDays'];
      if (attendanceKeys.includes(key)) {
        const response = await api.get(`/api/attendance/settings/${key}`);
        return response.data;
      }
      const response = await api.get(`/api/salary/settings/${key}`);
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
  const response = await api.post('/api/salary/settings/overtime-rate', { value });
    return response.data;
  },
  updateHolidayRate: async (value: any) => {
  const response = await api.post('/api/salary/settings/holiday-rate', { value });
    return response.data;
  },
  updatePenaltyRate: async (value: any) => {
  const response = await api.post('/api/salary/settings/penalty-rate', { value });
    return response.data;
  },
  updateUnauthorizedAbsencePenaltyRate: async (value: any) => {
  const response = await api.post('/api/salary/settings/unauthorized-absence-penalty-rate', { value });
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