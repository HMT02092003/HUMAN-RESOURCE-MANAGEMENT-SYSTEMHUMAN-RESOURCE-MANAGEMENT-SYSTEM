import { Request, Response } from 'express';
import HolidayModel from '@/Models/HolidayModel';

export const getHolidays = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query as any;

    let query = HolidayModel.query();

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      query = query.where(function (this: any) {
        this.whereBetween('start_date', [startDate, endDate])
          .orWhereBetween('end_date', [startDate, endDate])
          .orWhere(function (this: any) {
            this.where('start_date', '<=', startDate).andWhere('end_date', '>=', endDate);
          });
      });
    } else if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.where(function (this: any) {
        this.whereBetween('start_date', [startDate, endDate])
          .orWhereBetween('end_date', [startDate, endDate]);
      });
    }

    const holidays = await query.orderBy('start_date', 'asc');

    return res.json({ success: true, data: holidays });
  } catch (error: any) {
    console.error('❌ Error fetching holidays:', error);
    return res.status(500).json({ success: false, message: error.message || 'Không thể lấy danh sách ngày lễ' });
  }
};

export const createHoliday = async (req: Request, res: Response) => {
  try {
    const { name, start_date, end_date, description, importance } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (tên, ngày bắt đầu, ngày kết thúc)' });
    }

    const holiday = await HolidayModel.query().insert({
      name,
      start_date,
      end_date,
      description,
      importance: importance || 5
    });

    return res.json({ success: true, message: 'Thêm ngày lễ thành công', data: holiday });
  } catch (error: any) {
    console.error('❌ Error creating holiday:', error);
    return res.status(500).json({ success: false, message: error.message || 'Không thể tạo ngày lễ' });
  }
};

export const updateHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, description, importance } = req.body;

    const holiday = await HolidayModel.query().findById(id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ngày lễ' });
    }

    await HolidayModel.query().patchAndFetchById(id, {
      name,
      start_date,
      end_date,
      description,
      importance
    });

    return res.json({ success: true, message: 'Cập nhật ngày lễ thành công' });
  } catch (error: any) {
    console.error('❌ Error updating holiday:', error);
    return res.status(500).json({ success: false, message: error.message || 'Không thể cập nhật ngày lễ' });
  }
};

export const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await HolidayModel.query().deleteById(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ngày lễ' });
    }

    return res.json({ success: true, message: 'Xóa ngày lễ thành công' });
  } catch (error: any) {
    console.error('❌ Error deleting holiday:', error);
    return res.status(500).json({ success: false, message: error.message || 'Không thể xóa ngày lễ' });
  }
};

export default { getHolidays, createHoliday, updateHoliday, deleteHoliday };
