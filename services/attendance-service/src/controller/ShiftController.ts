import { Request, Response } from 'express';
import { ShiftService } from '../services/ShiftService';
import CheckScopeService from '../services/CheckScopeService';

export class ShiftController {
  // ========== SHIFT MANAGEMENT (Quản lý mẫu ca) ==========

  /**
   * Lấy danh sách mẫu ca
   * GET /shifts
   */
  static async getAllShifts(_req: Request, res: Response) {
    try {
      const shifts = await ShiftService.getAllShifts();

      res.json({
        success: true,
        data: shifts,
        message: 'Lấy danh sách ca thành công'
      });
    } catch (error: any) {
      console.error('Error in getAllShifts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách ca'
      });
    }
  }

  /**
   * Lấy chi tiết mẫu ca
   * GET /shifts/:id
   */
  static async getShiftById(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID ca không được để trống'
        });
      }

      const shiftId = parseInt(id, 10);
      if (isNaN(shiftId)) {
        return res.status(400).json({
          success: false,
          message: 'ID ca không hợp lệ'
        });
      }

      const shift = await ShiftService.getShiftById(shiftId);

      return res.json({
        success: true,
        data: shift,
        message: 'Lấy thông tin ca thành công'
      });
    } catch (error: any) {
      console.error('Error in getShiftById:', error);
      const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thông tin ca'
      });
    }
  }

  /**
   * Tạo mẫu ca mới
   * POST /shifts
   */
  static async createShift(req: Request, res: Response) {
    try {
      const shift = await ShiftService.createShift(req.body);

      res.status(201).json({
        success: true,
        data: shift,
        message: 'Tạo ca thành công'
      });
    } catch (error: any) {
      console.error('Error in createShift:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo ca'
      });
    }
  }

  /**
   * Cập nhật mẫu ca
   * PUT /shifts/:id
   */
  static async updateShift(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID ca không được để trống'
        });
      }

      const shiftId = parseInt(id, 10);
      if (isNaN(shiftId)) {
        return res.status(400).json({
          success: false,
          message: 'ID ca không hợp lệ'
        });
      }

      const shift = await ShiftService.updateShift(shiftId, req.body);

      return res.json({
        success: true,
        data: shift,
        message: 'Cập nhật ca thành công'
      });
    } catch (error: any) {
      console.error('Error in updateShift:', error);
      const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật ca'
      });
    }
  }

  /**
   * Xóa mẫu ca
   * DELETE /shifts/:id
   */
  static async deleteShift(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID ca không được để trống'
        });
      }

      const shiftId = parseInt(id, 10);
      if (isNaN(shiftId)) {
        return res.status(400).json({
          success: false,
          message: 'ID ca không hợp lệ'
        });
      }

      const result = await ShiftService.deleteShift(shiftId);

      return res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error in deleteShift:', error);
      const statusCode = error.message.includes('Không tìm thấy') ? 404 :
                         error.message.includes('Không thể xóa') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi xóa ca'
      });
    }
  }

  /**
   * Xóa nhiều mẫu ca cùng lúc
   * POST /shifts/bulk-delete
   */
  static async bulkDeleteShifts(req: Request, res: Response) {
    try {
      const ids = req.body?.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách IDs không hợp lệ' });
      }

      const result = await ShiftService.bulkDeleteShifts(ids.map((i: any) => Number(i)));

      return res.json({ success: true, data: result, message: result.message });
    } catch (error: any) {
      console.error('Error in bulkDeleteShifts:', error);
      const statusCode = error.message.includes('Không thể xóa') ? 400 : 500;
      return res.status(statusCode).json({ success: false, message: error.message || 'Lỗi khi xóa nhiều ca' });
    }
  }

  // ========== EMPLOYEE SCHEDULES (Lịch đăng ký ca) ==========

  /**
   * Lấy danh sách lịch của user hiện tại
   * GET /schedules/my
   */
  static async getMySchedules(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const filters = {
        status: req.query['status'] as string | undefined,
        startDate: req.query['startDate'] as string | undefined,
        endDate: req.query['endDate'] as string | undefined
      };

      const schedules = await ShiftService.getUserSchedules(userId, filters);

      res.json({
        success: true,
        data: schedules,
        message: 'Lấy danh sách lịch thành công'
      });
    } catch (error: any) {
      console.error('Error in getMySchedules:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách lịch'
      });
    }
  }

  /**
   * Lấy danh sách lịch chờ duyệt (Admin)
   * GET /schedules/pending
   */
  static async getPendingSchedules(_req: Request, res: Response) {
    try {
      const schedules = await ShiftService.getPendingSchedules();

      res.json({
        success: true,
        data: schedules,
        message: 'Lấy danh sách lịch chờ duyệt thành công'
      });
    } catch (error: any) {
      console.error('Error in getPendingSchedules:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách lịch chờ duyệt'
      });
    }
  }

  /**
   * Lấy chi tiết lịch
   * GET /schedules/:id
   */
  static async getScheduleById(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không được để trống'
        });
      }

      const scheduleId = parseInt(id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không hợp lệ'
        });
      }

      const schedule = await ShiftService.getScheduleById(scheduleId);

      return res.json({
        success: true,
        data: schedule,
        message: 'Lấy thông tin lịch thành công'
      });
    } catch (error: any) {
      console.error('Error in getScheduleById:', error);
      const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thông tin lịch'
      });
    }
  }

  /**
   * Tạo lịch đăng ký mới
   * POST /schedules
   */
  static async createSchedule(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const data = {
        ...req.body,
        user_id: userId
      };

      const schedule = await ShiftService.createSchedule(data);

      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Đăng ký lịch thành công'
      });
    } catch (error: any) {
      console.error('Error in createSchedule:', error);
      const statusCode = error.message.includes('đã đăng ký') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi đăng ký lịch'
      });
    }
  }

  /**
   * Đăng ký nhiều ngày
   * POST /schedules/bulk
   */
  static async bulkCreateSchedules(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const data = {
        ...req.body,
        user_id: userId
      };

      const result = await ShiftService.bulkCreateSchedules(data);

      res.status(201).json({
        success: true,
        data: result,
        message: `Đăng ký thành công ${result.success} lịch, thất bại ${result.failed} lịch`
      });
    } catch (error: any) {
      console.error('Error in bulkCreateSchedules:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi đăng ký lịch hàng loạt'
      });
    }
  }

  /**
   * Cập nhật lịch
   * PUT /schedules/:id
   */
  static async updateSchedule(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không được để trống'
        });
      }

      const scheduleId = parseInt(id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không hợp lệ'
        });
      }

      const userId = (req as any).user?.id;
      const schedule = await ShiftService.updateSchedule(scheduleId, req.body, userId);

      return res.json({
        success: true,
        data: schedule,
        message: 'Cập nhật lịch thành công'
      });
    } catch (error: any) {
      console.error('Error in updateSchedule:', error);
      const statusCode = error.message.includes('không có quyền') ? 403 :
                         error.message.includes('Không tìm thấy') ? 404 :
                         error.message.includes('Chỉ có thể') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật lịch'
      });
    }
  }

  /**
   * Hủy lịch
   * DELETE /schedules/:id
   */
  static async cancelSchedule(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không được để trống'
        });
      }

      const scheduleId = parseInt(id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không hợp lệ'
        });
      }

      const userId = (req as any).user?.id;
      const result = await ShiftService.cancelSchedule(scheduleId, userId);

      return res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error in cancelSchedule:', error);
      const statusCode = error.message.includes('không có quyền') ? 403 :
                         error.message.includes('Không tìm thấy') ? 404 :
                         error.message.includes('Chỉ có thể') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi hủy lịch'
      });
    }
  }

  /**
   * Duyệt lịch (Admin)
   * POST /schedules/:id/approve
   */
  static async approveSchedule(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không được để trống'
        });
      }

      const scheduleId = parseInt(id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không hợp lệ'
        });
      }

      const approvedBy = (req as any).user?.id;
      const result = await ShiftService.approveSchedule(scheduleId, approvedBy);

      return res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error in approveSchedule:', error);
      const statusCode = error.message.includes('Không tìm thấy') ? 404 :
                         error.message.includes('Chỉ có thể') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi duyệt lịch'
      });
    }
  }

  /**
   * Từ chối lịch (Admin)
   * POST /schedules/:id/reject
   */
  static async rejectSchedule(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không được để trống'
        });
      }

      const scheduleId = parseInt(id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({
          success: false,
          message: 'ID lịch không hợp lệ'
        });
      }

      const approvedBy = (req as any).user?.id;
      const result = await ShiftService.rejectSchedule(scheduleId, approvedBy);

      return res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error in rejectSchedule:', error);
      const statusCode = error.message.includes('Không tìm thấy') ? 404 :
                         error.message.includes('Chỉ có thể') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi từ chối lịch'
      });
    }
  }

  /**
   * Lấy thống kê theo tháng
   * GET /schedules/stats/:year/:month
   */
  static async getMonthlyStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const yearParam = req.params['year'];
      const monthParam = req.params['month'];

      if (!yearParam || !monthParam) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số năm hoặc tháng'
        });
      }

      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);

      if (isNaN(year) || isNaN(month)) {
        return res.status(400).json({
          success: false,
          message: 'Năm hoặc tháng không hợp lệ'
        });
      }

      const stats = await ShiftService.getMonthlyStats(userId, year, month);

      return res.json({
        success: true,
        data: stats,
        message: 'Lấy thống kê thành công'
      });
    } catch (error: any) {
      console.error('Error in getMonthlyStats:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thống kê'
      });
    }
  }

  // ========== SCHEDULE APPROVAL MANAGEMENT (Quản lý duyệt đơn đăng ký ca) ==========

  /**
   * Lấy danh sách đơn đăng ký ca (có phân trang và scope)
   * GET /schedules/approval
   */
  static async getSchedulesForApproval(req: Request, res: Response) {
    try {
      const token = req.headers['authorization'] || '';
      // Debugging: log incoming query and auth token presence to trace invalid ID issues
      console.log('[ShiftController] getSchedulesForApproval called with query:', req.query);
      console.log('[ShiftController] getSchedulesForApproval - has Authorization header?', !!req.headers['authorization']);
      
      // Check scope
      const scopeResult = await CheckScopeService.checkUserScope('ShiftApproval', token);
      
      if (!scopeResult.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền duyệt đơn đăng ký ca'
        });
      }

      // Get query params
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;
      const filters: any = {
        status: req.query['status'] as string,
        startDate: req.query['startDate'] as string,
        endDate: req.query['endDate'] as string,
        user_id: req.query['user_id'] ? parseInt(req.query['user_id'] as string) : undefined,
        searchField: req.query['searchField'] as string,
        searchText: req.query['searchText'] as string,
        sortField: req.query['sortField'] as string,
        sortOrder: req.query['sortOrder'] as string
      };

  // sanitize scope userIds coming from auth service
      let scopedUserIds: number[] = [];
      try {
        if (Array.isArray(scopeResult.userIds) && scopeResult.userIds.length > 0) {
          scopedUserIds = scopeResult.userIds.map((u: any) => Number(u)).filter((n: number) => !isNaN(n));
          if (scopedUserIds.length !== scopeResult.userIds.length) {
            console.warn('[ShiftController] getSchedulesForApproval - some scope userIds were invalid', { raw: scopeResult.userIds, sanitized: scopedUserIds });
          }
        }
      } catch (e) {
        console.error('[ShiftController] error sanitizing scope userIds', e);
        scopedUserIds = [];
      }

      const result = await ShiftService.getSchedulesForApproval(
        filters,
        page,
        limit,
        scopedUserIds
      );

      // Fetch user details
      const userIds = Array.from(new Set(result.data.map((s: any) => Number(s.user_id)).filter((n: number) => !isNaN(n))));
      let users: any[] = [];
      try {
        if (userIds.length > 0) {
          users = await CheckScopeService.getUsersByIds(userIds);
        }
      } catch (e) {
        console.error('[ShiftController] failed to fetch users for approval list', e);
        users = [];
      }
      const userMap = new Map(users.map((u: any) => [u.id, u]));

      // Enrich data with user info
      const enrichedData = result.data.map((schedule: any) => ({
        ...schedule,
        user: userMap.get(schedule.user_id) || null
      }));

      return res.json({
        success: true,
        data: enrichedData,
        pagination: result.pagination,
        message: 'Lấy danh sách đơn đăng ký thành công'
      });
    } catch (error: any) {
      console.error('Error in getSchedulesForApproval:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách đơn đăng ký'
      });
    }
  }

  /**
   * Duyệt nhiều đơn đăng ký cùng lúc
   * POST /schedules/approve
   */
  static async bulkApproveSchedules(req: Request, res: Response) {
    try {
      const token = req.headers['authorization'] || '';
      const approvedBy = (req as any).user?.id;
      
      // Check scope
      const scopeResult = await CheckScopeService.checkUserScope('ShiftApproval', token);
      
      if (!scopeResult.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền duyệt đơn đăng ký ca'
        });
      }

      const { ids, action } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách IDs không hợp lệ'
        });
      }

      let result;
      if (action === 'reject') {
        result = await ShiftService.bulkRejectSchedules(ids, approvedBy);
      } else {
        result = await ShiftService.bulkApproveSchedules(ids, approvedBy);
      }

      return res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error in bulkApproveSchedules:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi duyệt đơn đăng ký'
      });
    }
  }

  /**
   * Xóa nhiều đơn đăng ký cùng lúc
   * POST /schedules/delete
   */
  static async bulkDeleteSchedules(req: Request, res: Response) {
    try {
      // check auth (reuse scope check or just require authenticated)
      // For now assume authenticated user (authenticateToken middleware applied on route)

      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách IDs không hợp lệ' });
      }

      const result = await ShiftService.bulkDeleteSchedules(ids);

      return res.json({ success: true, data: result, message: result.message });
    } catch (error: any) {
      console.error('Error in bulkDeleteSchedules:', error);
      return res.status(500).json({ success: false, message: error.message || 'Lỗi khi xóa nhiều lịch đăng ký' });
    }
  }

  /**
   * Duyệt tất cả đơn đăng ký trong tháng
   * POST /schedules/approve-month
   */
  static async approveMonthSchedules(req: Request, res: Response) {
    try {
      const token = req.headers['authorization'] || '';
      const approvedBy = (req as any).user?.id;
      
      // Check scope
      const scopeResult = await CheckScopeService.checkUserScope('ShiftApproval', token);
      
      if (!scopeResult.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền duyệt đơn đăng ký ca'
        });
      }

      const { year, month } = req.body;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu năm hoặc tháng'
        });
      }

      const result = await ShiftService.approveMonthSchedules(
        year,
        month,
        approvedBy,
        scopeResult.userIds
      );

      return res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error: any) {
      console.error('Error in approveMonthSchedules:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi duyệt đơn đăng ký'
      });
    }
  }
}

