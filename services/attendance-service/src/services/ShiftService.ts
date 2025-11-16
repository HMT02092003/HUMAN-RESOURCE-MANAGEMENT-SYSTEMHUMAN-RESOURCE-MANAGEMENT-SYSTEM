import { ShiftModel } from '../Models/ShiftModel';
import { EmployeeScheduleModel } from '../Models/EmployeeScheduleModel';

export class ShiftService {
  // ========== SHIFT MANAGEMENT (Quản lý mẫu ca) ==========
  
  /**
   * Lấy tất cả mẫu ca
   */
  static async getAllShifts() {
    return await ShiftModel.query().orderBy('start_time');
  }

  /**
   * Lấy chi tiết mẫu ca
   */
  static async getShiftById(id: number) {
    const shift = await ShiftModel.query().findById(id);
    
    if (!shift) {
      throw new Error('Không tìm thấy ca làm việc');
    }
    
    return shift;
  }

  /**
   * Tạo mẫu ca mới
   */
  static async createShift(data: any) {
    return await ShiftModel.query().insert(data);
  }

  /**
   * Cập nhật mẫu ca
   */
  static async updateShift(id: number, data: any) {
    await this.getShiftById(id); // Check exists
    
    return await ShiftModel.query()
      .patchAndFetchById(id, data);
  }

  /**
   * Xóa mẫu ca
   */
  static async deleteShift(id: number) {
    await this.getShiftById(id); // Check exists
    
    // Kiểm tra có lịch đăng ký nào đang sử dụng không
    const schedules = await EmployeeScheduleModel.query()
      .where('shift_id', id)
      .whereIn('status', ['pending', 'approved']);
    
    if (schedules.length > 0) {
      throw new Error('Không thể xóa ca đang có lịch đăng ký');
    }

    await ShiftModel.query().deleteById(id);
    return { success: true, message: 'Đã xóa ca làm việc' };
  }

  /**
   * Xóa nhiều mẫu ca cùng lúc
   */
  static async bulkDeleteShifts(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    const numericIds = ids.map((i: any) => Number(i)).filter((n: number) => !isNaN(n));
    if (numericIds.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    // Kiểm tra có lịch đăng ký nào đang sử dụng không
    const schedules = await EmployeeScheduleModel.query()
      .whereIn('shift_id', numericIds)
      .whereIn('status', ['pending', 'approved']);

    if (schedules.length > 0) {
      const usedShiftIds = Array.from(new Set(schedules.map((s: any) => s.shift_id)));
      throw new Error('Không thể xóa ca đang có lịch đăng ký: ' + usedShiftIds.join(', '));
    }

    const deletedCount = await ShiftModel.query().delete().whereIn('id', numericIds);

    return { success: true, deleted: deletedCount, message: `Đã xóa ${deletedCount} ca` };
  }

  // ========== EMPLOYEE SCHEDULES (Lịch đăng ký ca) ==========

  /**
   * Lấy danh sách lịch của user
   */
  static async getUserSchedules(userId: number, filters: any = {}) {
    return await EmployeeScheduleModel.getByUser(userId, filters);
  }

  /**
   * Lấy danh sách lịch chờ duyệt
   */
  static async getPendingSchedules() {
    return await EmployeeScheduleModel.getPendingSchedules();
  }

  /**
   * Lấy chi tiết lịch
   */
  static async getScheduleById(id: number) {
    const schedule = await EmployeeScheduleModel.query()
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select('employee_schedules.*', 'shifts.name as shift_name', 'shifts.start_time', 'shifts.end_time', 'shifts.working_unit')
      .findById(id);
    
    if (!schedule) {
      throw new Error('Không tìm thấy lịch đăng ký');
    }
    
    return schedule;
  }

  /**
   * Tạo lịch đăng ký mới
   */
  static async createSchedule(data: any) {
    const { user_id, shift_id, date } = data;

    // Kiểm tra ca có tồn tại không
    await this.getShiftById(shift_id);

    // Kiểm tra trùng lặp
    const isDuplicate = await EmployeeScheduleModel.checkDuplicate(user_id, date);
    if (isDuplicate) {
      throw new Error('Bạn đã đăng ký lịch cho ngày này rồi');
    }

    // Tạo lịch mới
    return await EmployeeScheduleModel.query().insert({
      user_id,
      shift_id,
      date,
      notes: data.notes || null,
      status: 'pending'
    });
  }

  /**
   * Đăng ký nhiều ngày
   */
  static async bulkCreateSchedules(data: any) {
    const { user_id, shift_id, dates, notes } = data;

    // Kiểm tra ca
    await this.getShiftById(shift_id);

    const results: {
      success: number;
      failed: number;
      details: Array<{ date: string; success: boolean; reason?: string }>;
    } = {
      success: 0,
      failed: 0,
      details: []
    };

    for (const date of dates) {
      try {
        // Kiểm tra trùng
        const isDuplicate = await EmployeeScheduleModel.checkDuplicate(user_id, date);
        if (isDuplicate) {
          results.failed++;
          results.details.push({
            date,
            success: false,
            reason: 'Đã tồn tại đăng ký'
          });
          continue;
        }

        // Tạo lịch
        await EmployeeScheduleModel.query().insert({
          user_id,
          shift_id,
          date,
          notes: notes || null,
          status: 'pending'
        });

        results.success++;
        results.details.push({
          date,
          success: true
        });
      } catch (error: any) {
        results.failed++;
        results.details.push({
          date,
          success: false,
          reason: error.message
        });
      }
    }

    return results;
  }

  /**
   * Cập nhật lịch
   */
  static async updateSchedule(id: number, data: any, userId: number) {
    const schedule = await this.getScheduleById(id);

    // Chỉ cho phép cập nhật nếu là người tạo và status = pending
    if (schedule.user_id !== userId) {
      throw new Error('Bạn không có quyền cập nhật lịch này');
    }

    if (schedule.status !== 'pending') {
      throw new Error('Chỉ có thể cập nhật lịch đang chờ duyệt');
    }

    const updateData: any = {};
    if (data.notes !== undefined) updateData.notes = data.notes;

    return await EmployeeScheduleModel.query()
      .patchAndFetchById(id, updateData);
  }

  /**
   * Hủy lịch
   */
  static async cancelSchedule(id: number, userId: number) {
    const schedule = await this.getScheduleById(id);

    if (schedule.user_id !== userId) {
      throw new Error('Bạn không có quyền hủy lịch này');
    }

    if (schedule.status !== 'pending') {
      throw new Error('Chỉ có thể hủy lịch đang chờ duyệt');
    }

    await EmployeeScheduleModel.query().deleteById(id);
    
    return { success: true, message: 'Đã hủy lịch đăng ký' };
  }

  /**
   * Duyệt lịch
   */
  static async approveSchedule(id: number, approvedBy: number) {
    const schedule = await this.getScheduleById(id);

    if (schedule.status !== 'pending') {
      throw new Error('Chỉ có thể duyệt lịch đang chờ duyệt');
    }

    await EmployeeScheduleModel.query()
      .patchAndFetchById(id, {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      });
    
    return { success: true, message: 'Đã duyệt lịch đăng ký' };
  }

  /**
   * Từ chối lịch
   */
  static async rejectSchedule(id: number, approvedBy: number) {
    const schedule = await this.getScheduleById(id);

    if (schedule.status !== 'pending') {
      throw new Error('Chỉ có thể từ chối lịch đang chờ duyệt');
    }

    await EmployeeScheduleModel.query()
      .patchAndFetchById(id, {
        status: 'rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      });
    
    return { success: true, message: 'Đã từ chối lịch đăng ký' };
  }

  /**
   * Lấy thống kê theo tháng
   */
  static async getMonthlyStats(userId: number, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // compute correct last day of month to avoid invalid dates (Feb/30/etc)
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const schedules = await EmployeeScheduleModel.query()
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select('employee_schedules.*', 'shifts.working_unit')
      .where('employee_schedules.user_id', userId)
      .where('employee_schedules.date', '>=', startDate)
      .where('employee_schedules.date', '<=', endDate)
      .where('employee_schedules.status', 'approved');

    // Tính tổng working_unit
    const totalWorkingDays = schedules.reduce((sum: number, schedule: any) => {
      return sum + (parseFloat(schedule.working_unit) || 0);
    }, 0);

    return {
      total: schedules.length,
      totalWorkingDays,
      schedules
    };
  }

  // ========== SCHEDULE APPROVAL (Duyệt đơn đăng ký ca) ==========

  /**
   * Lấy danh sách đơn đăng ký ca với phân trang và scope
   * Hỗ trợ filters: status, startDate, endDate, user_id
   */
  static async getSchedulesForApproval(
    filters: any = {},
    page: number = 1,
    limit: number = 20,
    userIds: number[] = []
  ) {
    let query = EmployeeScheduleModel.query()
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select(
        'employee_schedules.*',
        'shifts.name as shift_name',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.working_unit'
      )
      .orderBy('employee_schedules.created_at', 'desc');

    // Scope filter
    if (userIds && userIds.length > 0) {
      query = query.whereIn('employee_schedules.user_id', userIds);
    }

    // Status filter
    if (filters.status) {
      query = query.where('employee_schedules.status', filters.status);
    }

    // Date range filter
    if (filters.startDate) {
      query = query.where('employee_schedules.date', '>=', filters.startDate);
    }
    if (filters.endDate) {
      query = query.where('employee_schedules.date', '<=', filters.endDate);
    }

    // User filter
    if (filters.user_id) {
      query = query.where('employee_schedules.user_id', filters.user_id);
    }

    // Search (basic) across shift name and notes when provided
    if (filters.searchText) {
      const text = `%${filters.searchText}%`;
      if (filters.searchField === 'shift_name') {
        query = query.where('shifts.name', 'ilike', text);
      } else if (filters.searchField === 'notes') {
        query = query.where('employee_schedules.notes', 'ilike', text);
      } else {
        // generic: search both
        query = query.where(function () {
          this.where('shifts.name', 'ilike', text).orWhere('employee_schedules.notes', 'ilike', text);
        });
      }
    }

    // Sorting
    if (filters.sortField) {
      const order = filters.sortOrder === 'desc' ? 'desc' : 'asc';
      if (filters.sortField === 'shift_name') {
        query = query.orderBy('shifts.name', order);
      } else {
        // allow sorting by schedule columns: id, date, created_at
        query = query.orderBy(`employee_schedules.${filters.sortField}`, order);
      }
    }

    // Pagination
    const offset = (page - 1) * limit;
    const total = await query.resultSize();
    const schedules = await query.limit(limit).offset(offset);

    return {
      data: schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Duyệt nhiều đơn đăng ký cùng lúc
   */
  static async bulkApproveSchedules(ids: number[], approvedBy: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    const numericIds = ids.map((i: any) => Number(i)).filter((n: number) => !isNaN(n));
    if (numericIds.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    // Kiểm tra các đơn có tồn tại và đang pending không
    const schedules = await EmployeeScheduleModel.query()
      .whereIn('id', numericIds)
      .where('status', 'pending');

    if (schedules.length === 0) {
      throw new Error('Không tìm thấy đơn đăng ký hợp lệ để duyệt');
    }

    // Duyệt tất cả
    const updatedCount = await EmployeeScheduleModel.query()
      .patch({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .whereIn('id', numericIds)
      .where('status', 'pending');

    return {
      success: true,
      approved: updatedCount,
      message: `Đã duyệt ${updatedCount} đơn đăng ký`
    };
  }

  /**
   * Từ chối nhiều đơn đăng ký cùng lúc
   */
  static async bulkRejectSchedules(ids: number[], approvedBy: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    const numericIds = ids.map((i: any) => Number(i)).filter((n: number) => !isNaN(n));
    if (numericIds.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    // Từ chối tất cả
    const updatedCount = await EmployeeScheduleModel.query()
      .patch({
        status: 'rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .whereIn('id', numericIds)
      .where('status', 'pending');

    return {
      success: true,
      rejected: updatedCount,
      message: `Đã từ chối ${updatedCount} đơn đăng ký`
    };
  }

  /**
   * Xóa nhiều lịch đăng ký cùng lúc
   */
  static async bulkDeleteSchedules(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    const numericIds = ids.map((i: any) => Number(i)).filter((n: number) => !isNaN(n));
    if (numericIds.length === 0) {
      throw new Error('Danh sách IDs không hợp lệ');
    }

    // Optionally, add checks here (ownership/permission). For now, delete directly.
    const deletedCount = await EmployeeScheduleModel.query().delete().whereIn('id', numericIds);

    return {
      success: true,
      deleted: deletedCount,
      message: `Đã xóa ${deletedCount} lịch đăng ký`
    };
  }

  /**
   * Duyệt tất cả đơn đăng ký trong tháng (theo scope)
   */
  static async approveMonthSchedules(
    year: number,
    month: number,
    approvedBy: number,
    userIds: number[] = []
  ) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // compute correct last day of month
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = EmployeeScheduleModel.query()
      .where('status', 'pending')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate);

    // Apply scope filter
    if (userIds && userIds.length > 0) {
      query = query.whereIn('user_id', userIds);
    }

    const updatedCount = await query.patch({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    });

    return {
      success: true,
      approved: updatedCount,
      message: `Đã duyệt ${updatedCount} đơn đăng ký trong tháng ${month}/${year}`
    };
  }
}
