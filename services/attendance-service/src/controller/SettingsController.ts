import { Request, Response } from "express";
import { validate } from "@/utils/validation-utility";
import SettingModel from "@/Models/SettingsModel";

export const getSettings = async (_req: Request, res: Response) => {
    try {
        const result = await SettingModel.query();

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const inputs = req.body;
        const allowFields = {
            WorkingHours: { start: 'string', end: 'string' },
            LunchBreak: { start: 'string', end: 'string' },
            OvertimeRate: { rate: 'number' },
            HolidayRate: { rate: 'number' }
        };

        const params = validate(inputs, allowFields, {
            removeNotAllow: true,
        });

        console.log('Updating settings with params:', params);

        let convertData = [
            {
                key: 'WorkingHours',
                name: "Giờ hành chính",
                value: JSON.stringify(params['WorkingHours'])
            },
            {
                key: 'LunchBreak',
                name: "Giờ nghỉ trưa",
                value: JSON.stringify(params['LunchBreak'])
            },
            {
                key: 'OvertimeRate',
                name: "Tỷ lệ làm thêm",
                value: JSON.stringify(params['OvertimeRate'])
            },
            {
                key: 'HolidayRate',
                name: "Tỷ lệ ngày nghỉ",
                value: JSON.stringify(params['HolidayRate'])
            }
        ];

        console.log('Converted data for database:', convertData);

        await SettingModel.query().delete();
        await SettingModel.query().insert(convertData);

        // Trả về format object cho frontend
        const responseData = {
            WorkingHours: params['WorkingHours'],
            LunchBreak: params['LunchBreak'],
            OvertimeRate: params['OvertimeRate'],
            HolidayRate: params['HolidayRate']
        };

        return res.status(200).json(responseData);
    } catch (error: any) {
        console.error('Update settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
