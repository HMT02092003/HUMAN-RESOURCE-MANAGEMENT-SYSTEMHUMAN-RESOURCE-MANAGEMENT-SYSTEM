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
            HolidayRate: { rate: 'number' },
            PenaltyRate: { rate: 'number' },
            WorkingDays: {
                monday: 'boolean',
                tuesday: 'boolean',
                wednesday: 'boolean',
                thursday: 'boolean',
                friday: 'boolean',
                saturday: 'boolean',
                sunday: 'boolean'
            }
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
            },
            {
                key: 'PenaltyRate',
                name: "Tỷ lệ phạt đi muộn/về sớm",
                value: JSON.stringify(params['PenaltyRate'])
            },
            {
                key: 'WorkingDays',
                name: "Ngày làm việc trong tuần",
                value: JSON.stringify(params['WorkingDays'])
            }
        ];

        console.log('Converted data for database:', convertData);

        // Xử lý từng setting riêng biệt để tránh duplicate key
        for (const setting of convertData) {
            const existing = await SettingModel.query().findOne('key', setting.key);
            
            if (existing) {
                // Cập nhật nếu đã tồn tại
                await SettingModel.query()
                    .where('key', setting.key)
                    .update({
                        name: setting.name,
                        value: setting.value
                    });
            } else {
                // Insert nếu chưa tồn tại
                await SettingModel.query().insert(setting);
            }
        }

        // Trả về format object cho frontend
        const responseData = {
            WorkingHours: params['WorkingHours'],
            LunchBreak: params['LunchBreak'],
            OvertimeRate: params['OvertimeRate'],
            HolidayRate: params['HolidayRate'],
            PenaltyRate: params['PenaltyRate'],
            WorkingDays: params['WorkingDays']
        };

        return res.status(200).json(responseData);
    } catch (error: any) {
        console.error('Update settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
