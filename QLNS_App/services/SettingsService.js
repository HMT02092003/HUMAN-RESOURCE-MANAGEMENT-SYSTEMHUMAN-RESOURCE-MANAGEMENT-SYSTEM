import apiService from './apiService';

// Default settings - giống web frontend
const DEFAULT_SETTINGS = {
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
    },
    BHXH: { rate: 8.0 },
    BHYT: { rate: 1.5 },
    TNCN: { rate: 0.0 }
};

const SettingsService = {
    // Lấy tất cả settings
    getAllSettings: async () => {
        try {
            // Gọi cả 2 API giống web
            const [attResp, salResp] = await Promise.allSettled([
                apiService.get('/attendance/settings'),
                apiService.get('/salary/settings')
            ]);

            const attendanceData = attResp.status === 'fulfilled' ? attResp.value.data : null;
            const salaryData = salResp.status === 'fulfilled' ? salResp.value.data : null;

            // Merge data
            const merged = { ...DEFAULT_SETTINGS };

            // Parse attendance data
            if (attendanceData && Array.isArray(attendanceData)) {
                attendanceData.forEach((s) => {
                    try {
                        merged[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
                    } catch {
                        merged[s.key] = s.value;
                    }
                });
            }

            // Parse salary data
            if (salaryData && Array.isArray(salaryData)) {
                salaryData.forEach((s) => {
                    if (merged[s.key] === undefined) {
                        try {
                            merged[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
                        } catch {
                            merged[s.key] = s.value;
                        }
                    }
                });
            }

            console.log('📋 [SettingsService] Loaded settings:', merged);
            return merged;
        } catch (error) {
            console.error('❌ [SettingsService] Error fetching settings:', error);
            return DEFAULT_SETTINGS;
        }
    },

    // Cập nhật setting theo key
    updateSetting: async (key, value) => {
        try {
            const data = { key, value };
            const attendanceKeys = ['WorkingHours', 'LunchBreak', 'WorkingDays'];
            const salaryKeys = ['OvertimeRate', 'HolidayRate', 'PenaltyRate', 'UnauthorizedAbsencePenaltyRate', 'BHXH', 'BHYT', 'TNCN'];

            let response;
            if (attendanceKeys.includes(key)) {
                response = await apiService.post('/attendance/settings/key', data);
            } else if (salaryKeys.includes(key)) {
                response = await apiService.post('/salary/settings/key', data);
            } else {
                // Default to attendance
                response = await apiService.post('/attendance/settings/key', data);
            }

            console.log(`✅ [SettingsService] Updated ${key}:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`❌ [SettingsService] Error updating ${key}:`, error);
            throw error;
        }
    },

    // Lấy setting theo key
    getSettingByKey: async (key) => {
        try {
            const attendanceKeys = ['WorkingHours', 'LunchBreak', 'WorkingDays'];
            let response;
            
            if (attendanceKeys.includes(key)) {
                response = await apiService.get(`/attendance/settings/${key}`);
            } else {
                response = await apiService.get(`/salary/settings/${key}`);
            }
            
            return response.data;
        } catch (error) {
            console.error(`❌ [SettingsService] Error fetching ${key}:`, error);
            throw error;
        }
    },

    // Convenience methods
    updateWorkingHours: async (value) => {
        return SettingsService.updateSetting('WorkingHours', value);
    },

    updateLunchBreak: async (value) => {
        return SettingsService.updateSetting('LunchBreak', value);
    },

    updateWorkingDays: async (value) => {
        return SettingsService.updateSetting('WorkingDays', value);
    },

    updateOvertimeRate: async (value) => {
        return SettingsService.updateSetting('OvertimeRate', value);
    },

    updateHolidayRate: async (value) => {
        return SettingsService.updateSetting('HolidayRate', value);
    },

    updatePenaltyRate: async (value) => {
        return SettingsService.updateSetting('PenaltyRate', value);
    },

    updateUnauthorizedAbsencePenaltyRate: async (value) => {
        return SettingsService.updateSetting('UnauthorizedAbsencePenaltyRate', value);
    },

    updateBHXH: async (value) => {
        return SettingsService.updateSetting('BHXH', value);
    },

    updateBHYT: async (value) => {
        return SettingsService.updateSetting('BHYT', value);
    },

    updateTNCN: async (value) => {
        return SettingsService.updateSetting('TNCN', value);
    },

    // Lấy default settings
    getDefaultSettings: () => {
        return { ...DEFAULT_SETTINGS };
    }
};

export default SettingsService;
