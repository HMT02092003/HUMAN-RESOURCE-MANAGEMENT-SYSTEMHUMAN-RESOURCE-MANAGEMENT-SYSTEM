import SettingModel from '@/Models/SettingsModel';

export class SettingsService {
  static async getSettingValue(key: string): Promise<any | null> {
    try {
      const s = await SettingModel.query().findOne('key', key);
      if (!s) return null;
      try {
        return typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
      } catch (e) {
        return s.value;
      }
    } catch (error) {
      console.error('⚠️ Error reading setting', key, error);
      return null;
    }
  }

  static async getUnauthorizedAbsencePenaltyRate(): Promise<number | null> {
    const v = await this.getSettingValue('UnauthorizedAbsencePenaltyRate');
    if (v == null) return null;
    if (typeof v === 'object' && v.rate !== undefined) return parseFloat(v.rate);
    return parseFloat(v as any) || null;
  }

  static async getWorkingDays(): Promise<any | null> {
    return this.getSettingValue('WorkingDays');
  }

  /**
   * Lấy OT rate cho ngày thường (OvertimeRateInUnits)
   * Mặc định: 1.5
   */
  static async getOvertimeRateInUnits(): Promise<number> {
    try {
      const v = await this.getSettingValue('OvertimeRateInUnits');
      if (v == null) return 1.5; // default
      if (typeof v === 'object' && v.rate !== undefined) return parseFloat(v.rate);
      return parseFloat(v as any) || 1.5;
    } catch (error) {
      console.error('⚠️ Error reading OvertimeRateInUnits:', error);
      return 1.5;
    }
  }

  /**
   * Lấy OT rate cho ngày lễ (HolidayOvertimeRateInUnits)
   * Mặc định: 3
   */
  static async getHolidayOvertimeRateInUnits(): Promise<number> {
    try {
      const v = await this.getSettingValue('HolidayOvertimeRateInUnits');
      if (v == null) return 3; // default
      if (typeof v === 'object' && v.rate !== undefined) return parseFloat(v.rate);
      return parseFloat(v as any) || 3;
    } catch (error) {
      console.error('⚠️ Error reading HolidayOvertimeRateInUnits:', error);
      return 3;
    }
  }
}

export default SettingsService;
