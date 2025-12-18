import { Request, Response } from 'express';
import HolidayModel from '@/Models/HolidayModel';

export const getHolidays = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query as any;

    let query = HolidayModel.query();

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      query = query.where(function(this: any) {
        this.whereBetween('start_date', [startDate, endDate])
          .orWhereBetween('end_date', [startDate, endDate])
          .orWhere(function() {
            this.where('start_date', '<=', startDate).andWhere('end_date', '>=', endDate);
          });
      });
    }

    const holidays = await query.orderBy('start_date', 'asc');

    res.json({ success: true, data: holidays });
  } catch (error: any) {
    console.error('❌ Error fetching holidays:', error);
    res.status(500).json({ success: false, message: error.message || 'Không thể lấy danh sách ngày lễ' });
  }
};

export default { getHolidays };
