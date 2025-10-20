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
}

export default SettingsService;
