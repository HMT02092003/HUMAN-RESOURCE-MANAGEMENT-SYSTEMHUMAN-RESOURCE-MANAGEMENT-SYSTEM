import { ShiftModel } from '../Models/ShiftModel';
import { EmployeeScheduleModel } from '../Models/EmployeeScheduleModel';
import { applySearch, applyFilters, applySorting, applyPagination } from '../utils/query-builder';

export class ShiftService {
  // ========== SHIFT MANAGEMENT (Quản lý mẫu ca) ==========

  /**
   * Lấy tất cả mẫu ca
   */
  static async getAllShifts() {
    return await ShiftModel.query().orderBy('start_time');
  }

  /**
   * Lấy danh sách mẫu ca có phân trang, tìm kiếm, sắp xếp
   */
  static async getAllShiftsPaginated(params: any = {}) {
    // Use shared query-builder to support search, filters, sort and pagination.
    const baseQuery = ShiftModel.query();

    const config = {
      // fields that can be searched with the generic `search` param
      searchFields: ['name', 'shift_name', 'start_time', 'end_time', 'description'],
      // allowed filter fields (will be picked from query params)
      filterFields: ['working_unit', 'created_at', 'created_atFrom', 'created_atTo'],
      // map frontend field names to DB columns when necessary
      fieldMapping: {
        working_unit: 'working_unit',
        created_at: 'created_at',
        shift_name: 'name'  // map shift_name to name for compatibility
      },
      defaultSort: { field: 'created_at', order: 'desc' }
    };

    // Build query manually so we can support per-column partial (ILIKE) searches
    let query = baseQuery;

    // Per-column partial searches (ILIKE)
    if (params.name) {
      query = applySearch(query, String(params.name), ['name'], 'name');
    }
    if (params.shift_name) {
      query = applySearch(query, String(params.shift_name), ['name'], 'shift_name');
    }
    if (params.description) {
      query = applySearch(query, String(params.description), ['description'], 'description');
    }
    if (params.start_time) {
      query = query.where('start_time', 'ilike', `%${String(params.start_time)}%`);
    }
    if (params.end_time) {
      query = query.where('end_time', 'ilike', `%${String(params.end_time)}%`);
    }

    // Numeric filter
    if (params.working_unit !== undefined && params.working_unit !== null && params.working_unit !== '') {
      const val = Number(params.working_unit);
      if (!Number.isNaN(val)) query = query.where('working_unit', val);
    }

    // Date filters (created_atFrom / created_atTo) or exact created_at
    if (params.created_at) {
      const dateStr = String(params.created_at).split('T')[0];
      query = query.whereRaw(`DATE(created_at) = ?`, [dateStr]);
    }
    if (params.created_atFrom) {
      query = query.where('created_at', '>=', params.created_atFrom);
    }
    if (params.created_atTo) {
      const endValue = String(params.created_atTo).includes(' ') ? params.created_atTo : `${params.created_atTo} 23:59:59`;
      query = query.where('created_at', '<=', endValue);
    }

    // Global search param (search) - if present, search across configured searchFields
    if (params.search) {
      query = applySearch(query, String(params.search), config.searchFields, params.search_field);
    }

    // Apply sorting
    const sortOrder = (params.order || config.defaultSort.order) as 'asc' | 'desc';
    query = applySorting(query, String(params.sort || config.defaultSort.field), sortOrder, config.fieldMapping, config.defaultSort as { field: string; order: 'asc' | 'desc' });

    // Count total
    const countQuery = query.clone().clearOrder();
    const total = await countQuery.resultSize();

    // Pagination
    const page = parseInt(String(params.page || 1)) || 1;
    const limit = parseInt(String(params.limit || params.pageSize || 10)) || 10;
    query = applyPagination(query, page, limit);

    const data = await query;

    return {
      data,
      total,
      page,
      pageSize: limit,
    };
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
   * Lấy danh sách lịch của user có phân trang, tìm kiếm, sắp xếp
   * Sử dụng query-builder để giảm code trùng lặp
   */
  static async getUserSchedulesPaginated(
    userId: number,
    filters: any = {},
    page: number = 1,
    limit: number = 10
  ) {
    // Field mapping cho sort - map từ frontend field sang database column
    const sortFieldMapping: Record<string, string> = {
      shift_name: 'shifts.name',
      date: 'employee_schedules.date',
      status: 'employee_schedules.status',
      created_at: 'employee_schedules.created_at',
      notes: 'employee_schedules.notes',
      start_time: 'shifts.start_time',
      end_time: 'shifts.end_time'
    };

    // Build base query
    let query = EmployeeScheduleModel.query()
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select(
        'employee_schedules.*',
        'shifts.name as shift_name',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.working_unit'
      )
      .where('employee_schedules.user_id', userId);

    // Build filter params cho query-builder
    const filterParams: Record<string, any> = {};
    if (filters.status) filterParams['employee_schedules.status'] = filters.status;
    if (filters.startDate) filterParams['employee_schedules.dateFrom'] = filters.startDate;
    if (filters.endDate) filterParams['employee_schedules.dateTo'] = filters.endDate;
    if (filters.createdAtStart) filterParams['employee_schedules.created_atFrom'] = filters.createdAtStart;
    if (filters.createdAtEnd) filterParams['employee_schedules.created_atTo'] = filters.createdAtEnd;

    // Apply filters using query-builder
    query = applyFilters(query, filterParams, {
      'employee_schedules.date': 'employee_schedules.date',
      'employee_schedules.created_at': 'employee_schedules.created_at'
    });

    // Column-specific search filters (không dùng query-builder vì là ILIKE)
    if (filters.searchShiftName) {
      query = query.where('shifts.name', 'ilike', `%${filters.searchShiftName}%`);
    }
    if (filters.searchNotes) {
      query = query.where('employee_schedules.notes', 'ilike', `%${filters.searchNotes}%`);
    }

    // Apply sorting using query-builder
    query = applySorting(
      query,
      filters.sortField,
      filters.sortOrder === 'desc' ? 'desc' : 'asc',
      sortFieldMapping,
      { field: 'employee_schedules.date', order: 'desc' }
    );

    // Get total count before pagination
    const total = await query.clone().clearOrder().resultSize();

    // Debug log
    try {
      const sql = query.clone().toKnexQuery().toString();
      console.log('[ShiftService.getUserSchedulesPaginated] Query SQL:', sql);
      console.log('[ShiftService.getUserSchedulesPaginated] userId:', userId, 'filters:', JSON.stringify(filters));
      console.log('[ShiftService.getUserSchedulesPaginated] Total count:', total);
    } catch (e) {
      // ignore
    }

    // Apply pagination
    const schedules = await applyPagination(query, page, limit);

    console.log('[ShiftService.getUserSchedulesPaginated] Returned rows:', schedules.length);

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

    // Kiểm tra xem ngày này đã có ca được duyệt chưa
    const hasApproved = await EmployeeScheduleModel.hasApprovedSchedule(user_id, date);
    if (hasApproved) {
      throw new Error('Ngày này đã có ca làm việc được duyệt, không thể đăng ký thêm');
    }

    // Kiểm tra trùng lặp (pending hoặc approved)
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
        // Kiểm tra xem ngày này đã có ca được duyệt chưa
        const hasApproved = await EmployeeScheduleModel.hasApprovedSchedule(user_id, date);
        if (hasApproved) {
          results.failed++;
          results.details.push({
            date,
            success: false,
            reason: 'Ngày này đã có ca làm việc được duyệt'
          });
          continue;
        }

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

    // Nếu có thay đổi ngày hoặc ca, cần validate
    if (data.date !== undefined || data.shift_id !== undefined) {
      const newDate = data.date || schedule.date;
      const newShiftId = data.shift_id || schedule.shift_id;

      // Kiểm tra ca có tồn tại
      if (data.shift_id !== undefined) {
        await this.getShiftById(newShiftId);
      }

      // Nếu đổi ngày, kiểm tra ngày mới đã có ca được duyệt chưa
      if (data.date !== undefined && data.date !== schedule.date) {
        const hasApproved = await EmployeeScheduleModel.hasApprovedSchedule(userId, newDate);
        if (hasApproved) {
          throw new Error('Ngày này đã có ca làm việc được duyệt, không thể chuyển đến');
        }

        // Kiểm tra trùng lặp với các đăng ký khác (trừ chính nó)
        const duplicate = await EmployeeScheduleModel.query()
          .where('user_id', userId)
          .where('date', newDate)
          .whereNot('id', id).skipUndefined()
          .first();

        if (duplicate) {
          throw new Error('Ngày này đã có đăng ký khác');
        }

        updateData.date = newDate;
      }

      if (data.shift_id !== undefined) {
        updateData.shift_id = newShiftId;
      }
    }

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
    // Delegate single approve to bulk logic for consistent behaviour and fewer code paths
    const resp = await this.bulkApproveSchedules([id], approvedBy);
    return { success: true, approved: resp.approved, message: resp.message };
  }

  /**
   * Từ chối lịch
   */
  static async rejectSchedule(id: number, approvedBy: number) {
    // Delegate single reject to bulk logic
    const resp = await this.bulkRejectSchedules([id], approvedBy);
    return { success: true, rejected: resp.rejected, message: resp.message };
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
   * Sử dụng query-builder để giảm code trùng lặp
   * Hỗ trợ filters: status, startDate, endDate, user_id
   */
  static async getSchedulesForApproval(
    filters: any = {},
    page: number = 1,
    limit: number = 20,
    userIds: number[] = [],
    currentUserId?: number | null
  ) {
    // Field mapping cho sort - map từ frontend field sang database column
    const sortFieldMapping: Record<string, string> = {
      shift_name: 'shifts.name',
      date: 'employee_schedules.date',
      status: 'employee_schedules.status',
      created_at: 'employee_schedules.created_at',
      id: 'employee_schedules.id',
      notes: 'employee_schedules.notes'
    };

    // Searchable fields
    const searchFields = ['shifts.name', 'employee_schedules.notes'];

    // Build base query
    let query = EmployeeScheduleModel.query()
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select(
        'employee_schedules.*',
        'shifts.name as shift_name',
        'shifts.start_time',
        'shifts.end_time',
        'shifts.working_unit'
      );

    // Scope filter - đặc biệt, không dùng query-builder
    if (userIds && userIds.length > 0) {
      query = query.whereIn('employee_schedules.user_id', userIds);
    }

    // Exclude current user's own schedules from approval list
    if (currentUserId) {
      query = query.whereNot('employee_schedules.user_id', currentUserId).skipUndefined();
    }

    // User filter
    if (filters.user_id) {
      query = query.where('employee_schedules.user_id', filters.user_id);
    }

    // Build filter params cho query-builder
    const filterParams: Record<string, any> = {};
    if (filters.status) filterParams['employee_schedules.status'] = filters.status;
    if (filters.startDate) filterParams['employee_schedules.dateFrom'] = filters.startDate;
    if (filters.endDate) filterParams['employee_schedules.dateTo'] = filters.endDate;
    if (filters.dateStart) filterParams['employee_schedules.dateFrom'] = filters.dateStart;
    if (filters.dateEnd) filterParams['employee_schedules.dateTo'] = filters.dateEnd;
    if (filters.createdAtStart) filterParams['employee_schedules.created_atFrom'] = filters.createdAtStart;
    if (filters.createdAtEnd) filterParams['employee_schedules.created_atTo'] = filters.createdAtEnd;

    // Apply filters using query-builder
    query = applyFilters(query, filterParams, {
      'employee_schedules.date': 'employee_schedules.date',
      'employee_schedules.created_at': 'employee_schedules.created_at'
    });

    // Column-specific search filters (ILIKE search - không dùng applySearch vì cần ILIKE)
    if (filters.searchShiftName) {
      query = query.where('shifts.name', 'ilike', `%${filters.searchShiftName}%`);
    }
    if (filters.searchNotes) {
      query = query.where('employee_schedules.notes', 'ilike', `%${filters.searchNotes}%`);
    }

    // Generic search across shift name and notes
    if (filters.searchText) {
      query = applySearch(query, filters.searchText, searchFields, filters.searchField);
    }

    // Apply sorting using query-builder
    // IMPORTANT: Only sort by fields that exist in the database
    // User-related fields (user_fullName, user_department_name, user_chevron_name) will be sorted in-memory by controller
    const userRelatedSortFields = ['user_fullName', 'user_department_name', 'user_chevron_name', 'employeeName', 'fullName', 'department_name', 'chevron_name', 'searchDepartment'];
    const shouldSortInDB = filters.sortField && !userRelatedSortFields.includes(filters.sortField);

    if (shouldSortInDB) {
      query = applySorting(
        query,
        filters.sortField,
        filters.sortOrder === 'desc' ? 'desc' : 'asc',
        sortFieldMapping,
        { field: 'employee_schedules.created_at', order: 'desc' }
      );
    } else {
      // No sorting in DB, or will be sorted in-memory - use default order
      query = query.orderBy('employee_schedules.created_at', 'desc');
    }

    // Get total count before pagination
    const total = await query.clone().clearOrder().resultSize();

    // Apply pagination
    const schedules = await applyPagination(query, page, limit);

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
