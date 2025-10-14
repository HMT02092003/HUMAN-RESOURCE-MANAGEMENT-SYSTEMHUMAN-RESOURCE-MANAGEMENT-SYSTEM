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

export const getSettingsByKey = async (req: Request, res: Response) => {
    try {
        const inputs = req.params;

        const allowFields = {
            key: "string!",
        };

        let params = validate(inputs, allowFields, { removeNotAllow: true });

        const result = await SettingModel.query().findOne('key', params['key']);

        if (!result) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const getSettingByKey = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        console.log('Getting setting by key:', key);
        const setting = await SettingModel.query().findOne({ key });
        console.log('Found setting:', setting);
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        return res.json(setting);
    } catch (error) {
        console.error('Error fetching setting by key:', error);
        return res.status(500).json({ error: 'Internal server error' });
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
            UnauthorizedAbsencePenaltyRate: { rate: 'number' },
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
                key: 'UnauthorizedAbsencePenaltyRate',
                name: "Tỷ lệ phạt nghỉ không phép (% tổng lương tháng/ngày)",
                value: JSON.stringify(params['UnauthorizedAbsencePenaltyRate'])
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
            UnauthorizedAbsencePenaltyRate: params['UnauthorizedAbsencePenaltyRate'],
            WorkingDays: params['WorkingDays']
        };

        return res.status(200).json(responseData);
    } catch (error: any) {
        console.error('Update settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const updateSettingByKey = async (req: Request, res: Response) => {
    try {
        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({ error: "Key and value are required" });
        }

        const existingSetting = await SettingModel.query().findOne({ key });

        if (existingSetting) {
            // Update nếu đã tồn tại
            await SettingModel.query().patch({ value }).where({ key });
        } else {
            // Insert nếu chưa tồn tại - cần thêm name
            const nameMap: { [key: string]: string } = {
                'WorkingHours': 'Giờ hành chính',
                'LunchBreak': 'Giờ nghỉ trưa',
                'OvertimeRate': 'Tỷ lệ làm thêm',
                'HolidayRate': 'Tỷ lệ ngày nghỉ',
                'PenaltyRate': 'Tỷ lệ phạt đi muộn/về sớm',
                'UnauthorizedAbsencePenaltyRate': 'Tỷ lệ phạt nghỉ không phép',
                'WorkingDays': 'Ngày làm việc trong tuần'
            };
            const name = nameMap[key] || key;
            await SettingModel.query().insert({ key, name, value });
        }

        return res.status(200).json({ key, value });
    } catch (error: any) {
        console.error("Update setting by key error:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};
