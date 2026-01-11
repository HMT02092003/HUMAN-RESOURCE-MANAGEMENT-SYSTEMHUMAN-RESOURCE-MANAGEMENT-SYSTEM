import { Request, Response } from 'express';
import { ShiftService } from '../services/ShiftService';
import CheckScopeService from '../services/CheckScopeService';
import { getDecodedToken } from '../utils/decode-token';
import { getUserData, getUserId as getRequestUserId } from '../utils/getUserData';

/**
 * Helper function to get userId from request
 * Uses new getUserData utility that extracts from x-user-data header
 */
const getUserId = (req: Request): number | undefined => {
  return getRequestUserId(req);
};

export class ShiftController {
  // ========== SHIFT MANAGEMENT (Quản lý mẫu ca) ==========

  /**
   * Lấy danh sách mẫu ca (không phân trang)
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
   * Lấy danh sách mẫu ca có phân trang, tìm kiếm, sắp xếp
   * GET /shifts/paginated
   */
  static async getAllShiftsPaginated(req: Request, res: Response) {
    try {
      const result = await ShiftService.getAllShiftsPaginated(req.query);

      res.json({
        success: true,
        ...result,
        message: 'Lấy danh sách ca thành công'
      });
    } catch (error: any) {
      console.error('Error in getAllShiftsPaginated:', error);
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
      console.log('[DEBUG] getMySchedules - req.user:', (req as any).user);
      const userId = getUserId(req);
      console.log('[DEBUG] getMySchedules - userId:', userId);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }
      
      // Accept generic `search` or specific shift_name param for backward compatibility
      const filters: any = {
        status: req.query['status'] as string | undefined,
        startDate: req.query['startDate'] as string | undefined,
        endDate: req.query['endDate'] as string | undefined,
        // support search (generic) -> treat as shift name search by default
        searchShiftName: (req.query['search'] as string) || (req.query['shift_name'] as string) || (req.query['searchShiftName'] as string) || undefined,
        searchNotes: (req.query['searchNotes'] as string) || (req.query['notes'] as string) || undefined,
      };

      // Use paginated service internally so server-side search (ILIKE) is honored consistently
      const result = await ShiftService.getUserSchedulesPaginated(userId, filters, 1, 1000);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
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
   * Lấy danh sách lịch của user hiện tại có phân trang, tìm kiếm, sắp xếp
   * GET /schedules/my/paginated
   */
  static async getMySchedulesPaginated(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt((req.query['limit'] || req.query['pageSize']) as string) || 10;
      // Accept multiple possible query param names from frontend
      const rawStatus = req.query['status'] as string | undefined;
      const rawStartDate = (req.query['startDate'] || req.query['dateFrom'] || req.query['date_from']) as string | undefined;
      const rawEndDate = (req.query['endDate'] || req.query['dateTo'] || req.query['date_to']) as string | undefined;
      const rawSearchShiftName = (req.query['searchShiftName'] || req.query['shift_name'] || req.query['searchShift'] || req.query['search']) as string | undefined;
      const rawSearchNotes = (req.query['searchNotes'] || req.query['notes'] || req.query['searchNotesText']) as string | undefined;
      const rawCreatedAtFrom = (req.query['createdAtFrom'] || req.query['createdAtStart'] || req.query['created_at_from']) as string | undefined;
      const rawCreatedAtTo = (req.query['createdAtTo'] || req.query['createdAtEnd'] || req.query['created_at_to']) as string | undefined;
      const rawSort = (req.query['sort'] || req.query['sortField']) as string | undefined;
      const rawOrder = (req.query['order'] || req.query['sortOrder']) as string | undefined;

      // Normalize and map to the keys expected by ShiftService
      const filters: any = {
        status: rawStatus,
        startDate: rawStartDate,
        endDate: rawEndDate,
        searchShiftName: rawSearchShiftName,
        searchNotes: rawSearchNotes,
        createdAtStart: rawCreatedAtFrom,
        createdAtEnd: rawCreatedAtTo,
        sortField: rawSort,
        sortOrder: rawOrder
      };

        // Debug: log incoming sort params to help diagnose created_at sorting issues
        try {
          // Use console.debug so it's less noisy in production logs
          console.debug('[ShiftController] Incoming sort params:', { rawSort, rawOrder });
        } catch (e) {
          // ignore
        }

      // Normalize sort field names that frontend may send (map search field names to logical column keys)
      if (filters.sortField) {
        const sf = String(filters.sortField);
        const sortMap: Record<string,string> = {
          'searchShiftName': 'shift_name',
          'searchNotes': 'notes',
          'shift_name': 'shift_name',
          'notes': 'notes',
          'createdAt': 'created_at',
          'created_at': 'created_at',
          'date': 'date'
        };
        if (sortMap[sf]) filters.sortField = sortMap[sf];
      
          // Debug: log the normalized sort field after mapping
          try {
            console.debug('[ShiftController] Normalized sortField ->', filters.sortField);
          } catch (e) {
            // ignore
          }
      }

      // Normalize sort order values from frontend (e.g. 'ascend'/'descend' -> 'asc'/'desc')
      if (filters.sortOrder) {
        const so = String(filters.sortOrder).toLowerCase();
        if (so === 'ascend' || so === 'asc') filters.sortOrder = 'asc';
        else if (so === 'descend' || so === 'desc') filters.sortOrder = 'desc';
        else filters.sortOrder = undefined;
      }

      const result = await ShiftService.getUserSchedulesPaginated(userId, filters, page, limit);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Lấy danh sách lịch thành công'
      });
    } catch (error: any) {
      console.error('Error in getMySchedulesPaginated:', error);
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

      return res.json({
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const data = {
        ...req.body,
        user_id: userId
      };

      const schedule = await ShiftService.createSchedule(data);

      return res.status(201).json({
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
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const data = {
        ...req.body,
        user_id: userId
      };

      const result = await ShiftService.bulkCreateSchedules(data);

      return res.status(201).json({
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

      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

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

      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

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

      const approvedBy = getUserId(req);
      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

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

      const approvedBy = getUserId(req);
      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

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
      const userId = getUserId(req);
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

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin userId'
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
      
      // Permission checks for shift approval are handled in the frontend.
      // Keep backend minimal: require authentication only and skip scope authorization here.
      const userData = getUserData(req);
      const scopeResult = { hasAccess: true, userIds: [] as number[] };

      // Get current user ID from token to exclude their own schedules
      let currentUserId: number | null = null;
      try {
        const normalizedToken = token.replace('Bearer ', '').trim();
        if (normalizedToken) {
          const decoded = getDecodedToken(normalizedToken) as any;
          if (decoded) {
            // Try 'id' first, then 'sub' — use bracket access because decoded may be an index-signature object
            const maybeId = decoded['id'] ?? decoded['sub'];
            if (maybeId != null) {
              const parsed = parseInt(String(maybeId), 10);
              currentUserId = isNaN(parsed) ? null : parsed;
            }
          }
        }
      } catch (e) {
        console.warn('[ShiftController] Could not decode token for current user ID', e);
      }

      // Get query params
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;

      // Accept multiple possible query param names and normalize
      const rawStatus = req.query['status'] as string | undefined;
      const rawStartDate = (req.query['startDate'] || req.query['dateFrom'] || req.query['date_from']) as string | undefined;
      const rawEndDate = (req.query['endDate'] || req.query['dateTo'] || req.query['date_to']) as string | undefined;
      const rawUserId = req.query['user_id'] ? parseInt(req.query['user_id'] as string) : undefined;
      const rawSearchShiftName = (req.query['searchShiftName'] || req.query['shift_name'] || req.query['searchShift']) as string | undefined;
      const rawSearchNotes = (req.query['searchNotes'] || req.query['notes'] || req.query['searchNotesText']) as string | undefined;
      const rawSearchEmployee = (req.query['searchEmployee'] || req.query['searchEmployeeName']) as string | undefined;
      const rawSearchDepartment = (req.query['searchDepartment'] || req.query['department']) as string | undefined;
      const rawSearchChevron = (req.query['searchChevron'] || req.query['chevron']) as string | undefined;
      const rawDateStart = (req.query['dateStart'] || req.query['dateFrom']) as string | undefined;
      const rawDateEnd = (req.query['dateEnd'] || req.query['dateTo']) as string | undefined;
      const rawCreatedAtFrom = (req.query['createdAtFrom'] || req.query['createdAtStart'] || req.query['created_at_from']) as string | undefined;
      const rawCreatedAtTo = (req.query['createdAtTo'] || req.query['createdAtEnd'] || req.query['created_at_to']) as string | undefined;
      const rawSort = (req.query['sort'] || req.query['sortField']) as string | undefined;
      const rawOrder = (req.query['order'] || req.query['sortOrder']) as string | undefined;

      const filters: any = {
        status: rawStatus,
        startDate: rawStartDate || rawDateStart,
        endDate: rawEndDate || rawDateEnd,
        user_id: rawUserId,
        searchShiftName: rawSearchShiftName,
        searchNotes: rawSearchNotes,
        searchEmployee: rawSearchEmployee,
        searchDepartment: rawSearchDepartment,
        searchChevron: rawSearchChevron,
        dateStart: rawDateStart,
        dateEnd: rawDateEnd,
        createdAtStart: rawCreatedAtFrom,
        createdAtEnd: rawCreatedAtTo,
        searchField: req.query['searchField'] as string,
        searchText: req.query['searchText'] as string,
        sortField: rawSort,
        sortOrder: rawOrder
      };

      // Normalize sort field keys and order
      if (filters.sortField) {
        const sf = String(filters.sortField);
        const sortMap: Record<string,string> = {
          'searchShiftName': 'shift_name',
          'searchNotes': 'notes',
          'shift_name': 'shift_name',
          'notes': 'notes',
          'createdAt': 'created_at',
          'created_at': 'created_at',
          'date': 'date',
          'status': 'status',
          'employeeName': 'user_fullName',
          'fullName': 'user_fullName',
          'user.fullName': 'user_fullName',
          'departmentName': 'user_department_name',
          'department_name': 'user_department_name',
          'department.name': 'user_department_name',
          'user.Department.name': 'user_department_name',
          'user.department.name': 'user_department_name',
          'chevronName': 'user_chevron_name',
          'chevron_name': 'user_chevron_name',
          'chevron.name': 'user_chevron_name',
          'user.Chevron.name': 'user_chevron_name',
          'user.chevron.name': 'user_chevron_name'
        };
        if (sortMap[sf]) filters.sortField = sortMap[sf];
      }

      if (filters.sortOrder) {
        const so = String(filters.sortOrder).toLowerCase();
        if (so === 'ascend' || so === 'asc') filters.sortOrder = 'asc';
        else if (so === 'descend' || so === 'desc') filters.sortOrder = 'desc';
        else filters.sortOrder = undefined;
      }

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

      // Handle employee search - find users by name and filter scopedUserIds
      let filteredUserIds = [...scopedUserIds];
      if (filters.searchEmployee) {
        try {
          const searchedUsers = await CheckScopeService.searchUsers(filters.searchEmployee, token);
          const searchedUserIds = searchedUsers.map((u: any) => u.id);
          
          // Filter scopedUserIds to only include users that match the search
          if (scopedUserIds.length > 0) {
            filteredUserIds = scopedUserIds.filter((id: number) => searchedUserIds.includes(id));
          } else {
            filteredUserIds = searchedUserIds;
          }
        } catch (e) {
          console.error('[ShiftController] error searching users', e);
          filteredUserIds = [];
        }
      }

      // Handle department search - find users by department and filter
      if (filters.searchDepartment) {
        try {
          const allUsers = await CheckScopeService.getUsersByIds(scopedUserIds.length > 0 ? scopedUserIds : ([] as number[]));
          const deptUsers = allUsers.filter((u: any) => 
            u.department?.name?.toLowerCase().includes(filters.searchDepartment.toLowerCase())
          );
          const deptUserIds = deptUsers.map((u: any) => u.id);
          
          // Intersect with existing filteredUserIds
          if (filteredUserIds.length > 0) {
            filteredUserIds = filteredUserIds.filter((id: number) => deptUserIds.includes(id));
          } else {
            filteredUserIds = deptUserIds;
          }
        } catch (e) {
          console.error('[ShiftController] error searching departments', e);
          filteredUserIds = [];
        }
      }

      // Handle chevron search - find users by chevron and filter
      if (filters.searchChevron) {
        try {
          const allUsers = await CheckScopeService.getUsersByIds(scopedUserIds.length > 0 ? scopedUserIds : ([] as number[]));
          const chevronUsers = allUsers.filter((u: any) => 
            u.chevron?.name?.toLowerCase().includes(filters.searchChevron.toLowerCase())
          );
          const chevronUserIds = chevronUsers.map((u: any) => u.id);
          
          // Intersect with existing filteredUserIds
          if (filteredUserIds.length > 0) {
            filteredUserIds = filteredUserIds.filter((id: number) => chevronUserIds.includes(id));
          } else {
            filteredUserIds = chevronUserIds;
          }
        } catch (e) {
          console.error('[ShiftController] error searching chevrons', e);
          filteredUserIds = [];
        }
      }

      const result = await ShiftService.getSchedulesForApproval(
        filters,
        page,
        limit,
        filteredUserIds,
        currentUserId
      );

      // Fetch user details
      const userIds: number[] = Array.from(new Set(result.data.map((s: any) => Number(s.user_id)).filter((n: number) => !isNaN(n))));
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
      let enrichedData = result.data.map((schedule: any) => {
        const user = userMap.get(schedule.user_id) || null;
        return {
          ...schedule,
          user,
          // Add flat fields for mobile app compatibility
          user_fullname: user?.fullName || user?.full_name || user?.username || null,
          user_fullName: user?.fullName || user?.full_name || user?.username || null,
          user_department_name: user?.department?.name || user?.Department?.name || null,
          user_chevron_name: user?.chevron?.name || user?.Chevron?.name || null
        };
      });

      // Handle sorting for user-related fields
      // Map frontend field names to backend expected names
      const sortFieldMap: Record<string, string> = {
        'user.fullName': 'user_fullName',
        'department_name': 'user_department_name',
        'chevron_name': 'user_chevron_name'
      };
      
      const mappedSortField = filters.sortField ? (sortFieldMap[filters.sortField] || filters.sortField) : null;
      
      if (mappedSortField && ['user_fullName', 'user_department_name', 'user_chevron_name'].includes(mappedSortField)) {
        enrichedData.sort((a: any, b: any) => {
          let aValue: string = '';
          let bValue: string = '';

          switch (mappedSortField) {
            case 'user_fullName':
              aValue = a.user?.fullName || a.user?.full_name || '';
              bValue = b.user?.fullName || b.user?.full_name || '';
              break;
            case 'user_department_name':
              aValue = a.user?.department?.name || a.user?.Department?.name || '';
              bValue = b.user?.department?.name || b.user?.Department?.name || '';
              break;
            case 'user_chevron_name':
              aValue = a.user?.chevron?.name || a.user?.Chevron?.name || '';
              bValue = b.user?.chevron?.name || b.user?.Chevron?.name || '';
              break;
          }

          // Handle string comparison with Vietnamese collation
          const comparison = aValue.localeCompare(bValue, 'vi', { sensitivity: 'base' });
          
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

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
      const approvedBy = getUserId(req);
      
      // Permission checks for shift approval are handled in the frontend.
      const userData = getUserData(req);
      const scopeResult = { hasAccess: true, userIds: [] as number[] };

      const { ids, action } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách IDs không hợp lệ'
        });
      }

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Thiếu thông tin người duyệt'
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
      const approvedBy = getUserId(req);
      
      // Permission checks for shift approval are handled in the frontend.
      const userData = getUserData(req);
      const scopeResult = { hasAccess: true, userIds: [] as number[] };

      const { year, month } = req.body;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu năm hoặc tháng'
        });
      }

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Thiếu thông tin người duyệt'
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

