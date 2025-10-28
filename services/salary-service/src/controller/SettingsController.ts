import { Request, Response } from 'express';
import { validate } from '../ulits/validation';
import SettingModel from '../Models/SettingsModel';

export const getSettings = async (_req: Request, res: Response) => {
  try {
    const result = await SettingModel.query();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Get settings error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const getSettingByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await SettingModel.query().findOne({ key });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    return res.json(setting);
  } catch (error) {
    console.error('Error fetching setting by key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const inputs = req.body;
    // Accept any of these keys; validation will strip unknowns
    const allowFields: any = {
      WorkingHours: { start: 'string', end: 'string' },
      LunchBreak: { start: 'string', end: 'string' },
      OvertimeRate: { rate: 'number', perMinute: 'number', workingDaysPerMonth: 'number', hoursPerDay: 'number' },
      HolidayRate: { rate: 'number' },
      PenaltyRate: { rate: 'number' },
      UnauthorizedAbsencePenaltyRate: { rate: 'number' },
      WorkingDays: { monday: 'boolean', tuesday: 'boolean', wednesday: 'boolean', thursday: 'boolean', friday: 'boolean', saturday: 'boolean', sunday: 'boolean' },
      BHXH: { rate: 'number' },
      BHYT: { rate: 'number' },
      TNCN: { rate: 'number' }
    };

    const params = validate(inputs, allowFields, { removeNotAllow: true });

    const convertData: any[] = [];
    for (const k of Object.keys(params)) {
      convertData.push({ key: k, name: k, value: JSON.stringify(params[k]) });
    }

    for (const setting of convertData) {
      const existing = await SettingModel.query().findOne('key', setting.key);
      if (existing) {
        await SettingModel.query().where('key', setting.key).update({ name: setting.name, value: setting.value });
      } else {
        await SettingModel.query().insert(setting);
      }
    }

    // Return object format
    const responseData: any = {};
    for (const k of Object.keys(params)) responseData[k] = params[k];

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export const updateSettingByKey = async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'Key and value are required' });

    const existingSetting = await SettingModel.query().findOne({ key });
    if (existingSetting) {
      await SettingModel.query().patch({ value }).where({ key });
    } else {
      await SettingModel.query().insert({ key, name: key, value });
    }

    return res.status(200).json({ key, value });
  } catch (error: any) {
    console.error('Update setting by key error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

export default { getSettings, getSettingByKey, updateSettings, updateSettingByKey };
