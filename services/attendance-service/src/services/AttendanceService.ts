// AttendanceService façade — delegates heavy work to small services
import axios from 'axios';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { MonthlyReportService } from './MonthlyReportService';
import * as AttendanceRecordService from './attendance/AttendanceRecordService';
import AttendanceCalculationService from './attendance/AttendanceCalculationService';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';
import { getDecodedToken } from '@/utils/decode-token';

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name] as any[] | undefined;
    if (!list) continue;
    for (const iface of list) {
      if (iface && iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

const API_GATEWAY_URL = `http://${getLocalIpAddress()}:${process.env['API_GATEWAY_PORT'] || 4000}`;

const logger = { debug: () => { }, info: () => { }, warn: () => { }, error: (...args: any[]) => console.error(...args) };

export class AttendanceService {

  /**
   * Get monthly_attendances rows based on permission scope resolved by auth-service
   * Supports server-side filtering, sorting, and searching
   */
  static async getMonthlySummariesByScope(
    permissionKey: string, 
    req: any, 
    pager?: { 
      page?: number; 
      pageSize?: number; 
      month?: string;
      sort?: string;
      order?: string;
      [key: string]: any; // Dynamic filter fields
    }
  ) {
    const page = Math.max(0, (pager?.page || 0));
    const pageSize = Math.min(200, pager?.pageSize || 20);
    const sortField = pager?.sort;
    const sortOrder = (pager?.order || 'desc') as 'asc' | 'desc';

    try {
      const token = req.cookies?.token || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
      
      if (!token) {
        const err: any = new Error('Access token required');
        err.status = 401;
        throw err;
      }

      const AUTH_SERVICE_URL = `http://${getLocalIpAddress()}:${process.env['AUTH_SERVICE_PORT'] || 4001}`;

      // Step 1: Get scope userIds from check-scope
      const scopeResult = await axios.post(`${AUTH_SERVICE_URL}/api/users/check-scope`, 
        { permissionKey },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 5000 }
      );

      let allowedUserIds: number[] = scopeResult?.data?.userIds || [];
      console.log('[AttendanceService] Scope userIds count:', allowedUserIds.length);

      if (allowedUserIds.length === 0) {
        return { results: [], total: 0, page, pageSize };
      }

      // Step 2: Filter by user fields if provided
      const fullNameFilter = pager?.['fullName'];
      const usernameFilter = pager?.['username'];
      const departmentNameFilter = pager?.['departmentName'];

      let usersById: Record<number, any> = {};

      if (fullNameFilter || usernameFilter || departmentNameFilter) {
        try {
          let keyword = '';
          if (fullNameFilter && String(fullNameFilter).trim()) {
            keyword = String(fullNameFilter).trim();
          } else if (usernameFilter && String(usernameFilter).trim()) {
            keyword = String(usernameFilter).trim();
          }

          const searchParams: any = { page: 1, pageSize: 999999 };
          if (keyword) searchParams.keyword = keyword;

          const usersResp = await axios.get(`${AUTH_SERVICE_URL}/api/users/search`, {
            params: searchParams,
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
          });

          let matchingUsers = usersResp?.data?.results || usersResp?.data?.data || [];

          // Filter by departmentName if needed
          if (departmentNameFilter && String(departmentNameFilter).trim()) {
            const deptKeyword = String(departmentNameFilter).trim().toLowerCase();
            matchingUsers = matchingUsers.filter((u: any) => {
              const deptName = u.department?.name || '';
              return String(deptName).toLowerCase().includes(deptKeyword);
            });
          }

          const matchingUserIds = matchingUsers.map((u: any) => Number(u.id));

          // Intersect with scope allowedUserIds
          allowedUserIds = allowedUserIds.filter(id => matchingUserIds.includes(id));

          console.log('[AttendanceService] After user filters:', {
            matching: matchingUserIds.length,
            final: allowedUserIds.length
          });

          if (allowedUserIds.length === 0) {
            return { results: [], total: 0, page, pageSize };
          }

          // Build usersById map
          for (const u of matchingUsers) {
            if (allowedUserIds.includes(u.id)) {
              usersById[u.id] = u;
            }
          }
        } catch (searchErr: any) {
          console.error('[AttendanceService] Error filtering users:', searchErr.message);
        }
      }

      // Step 3: Fetch user details if not already fetched (for enrichment)
      if (Object.keys(usersById).length === 0 && allowedUserIds.length > 0) {
        try {
          const usersResp = await axios.post(`${AUTH_SERVICE_URL}/api/users/bulk`, 
            { userIds: allowedUserIds },
            { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
          );
          const users = usersResp?.data?.data || usersResp?.data || [];
          for (const u of users) usersById[u.id] = u;
        } catch (e: any) {
          console.error('[AttendanceService] Error fetching users:', e.message);
        }
      }

      // Step 4: Exclude current user
      let currentUserId: number | null = null;
      try {
        const decoded: any = getDecodedToken(token);
        if (decoded?.user?.id) currentUserId = Number(decoded.user.id);
      } catch (dErr) {
        logger.error('Failed to decode token', String((dErr as any)?.message || dErr));
      }

      if (currentUserId) {
        allowedUserIds = allowedUserIds.filter(id => id !== currentUserId);
      }

      if (allowedUserIds.length === 0) {
        return { results: [], total: 0, page, pageSize };
      }

      // Step 5: Query monthly_attendances
      const baseQuery = MonthlySummaryModel.query().whereIn('userId', allowedUserIds);

      // Apply filters for DB fields only (month, isApproved, numeric fields)
      const dbFields = ['month', 'isApproved', 'totalScheduledDays', 'presentDays', 'absentDays',
        'approvedLeaveDays', 'unauthorizedAbsenceDays', 'businessTripDays', 'lateDays', 'earlyLeaveDays',
        'totalLateMinutes', 'totalEarlyLeaveMinutes', 'totalWorkHours', 'averageWorkHours', 
        'totalWorkingUnits', 'totalOvertimeHours', 'totalOtWorkingUnits', 'totalOvertimeSalary',
        'totalLatePenalty', 'totalEarlyLeavePenalty', 'totalUnauthorizedAbsencePenalty', 'totalPenalty',
        'created_at', 'updated_at'];
      
      for (const field of dbFields) {
        const value = pager?.[field];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          const trimmedValue = String(value).trim();
          if (field === 'isApproved') {
            const boolValue = trimmedValue === 'true' || trimmedValue === '1';
            baseQuery.where(field, boolValue);
          } else if (field === 'month') {
            baseQuery.where(field, 'ilike', `%${trimmedValue}%`);
          } else {
            baseQuery.where(field, 'like', `%${trimmedValue}%`);
          }
        }
      }

      // Apply sorting
      const userEnrichedFields = ['fullName', 'username', 'departmentName'];
      const needsInMemorySort = sortField && userEnrichedFields.includes(sortField);
      
      if (sortField && !needsInMemorySort && dbFields.includes(sortField)) {
        baseQuery.orderBy(sortField, sortOrder);
      } else {
        baseQuery.orderBy('month', 'desc');
      }

      // Count total matching records
      const countQuery: any = baseQuery.clone();
      if (typeof countQuery.clearOrder === 'function') {
        countQuery.clearOrder();
      } else if (typeof countQuery.clearOrders === 'function') {
        countQuery.clearOrders();
      }
      const [countResult] = await countQuery.count('* as count') as any;
      const total = Number(countResult.count || 0);

      // Fetch paginated results
      const offset = page * pageSize;
      let results = await baseQuery.clone().limit(pageSize).offset(offset);

      console.log('[AttendanceService] DB query results:', {
        total,
        returned: results.length,
        page,
        pageSize
      });

      // Enrich results with user data (already have department from auth-service)
      results = results.map((r: any) => {
        const user = usersById[r.userId] || null;
        return {
          ...r,
          user: user,
          username: user?.username || null,
          fullName: user?.fullName || null,
          departmentId: user?.departmentId || null,
          departmentName: user?.department?.name || null,
          chevronId: user?.chevronId || null
        };
      });

      // Apply in-memory sorting for user-enriched fields if needed
      if (needsInMemorySort && sortField) {
        results.sort((a: any, b: any) => {
          const aVal = a[sortField] || '';
          const bVal = b[sortField] || '';
          const cmp = String(aVal).localeCompare(String(bVal));
          return sortOrder === 'asc' ? cmp : -cmp;
        });
      }

      return { results, total, page, pageSize };
    } catch (err: any) {
      try {
        const logPath = path.resolve(process.cwd(), 'logs', 'attendance-debug.log');
        fs.appendFileSync(logPath, `\n=== CATCH in getMonthlySummariesByScope (${new Date().toISOString()}) ===\n${err && err.stack ? err.stack : JSON.stringify(err)}\n`);
      } catch (e) {}
      if (err?.response?.status === 401 || err?.status === 401) {
        const e: any = new Error(err?.response?.data?.message || err?.message || 'Unauthorized');
        e.status = 401;
        throw e;
      }
      logger.error('getMonthlySummariesByScope', err?.message || err);
      return { results: [], total: 0, page: 0, pageSize: 0 };
    }
  }

  static async getUsersInDepartment(departmentId: number, token?: string) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const cfg: any = headers ? { headers } : {};
      const r = await axios.get(`${API_GATEWAY_URL}/api/auth/users/department/${departmentId}`, cfg);
      return r?.data?.data || [];
    } catch (err) {
      logger.error('getUsersInDepartment', err);
      return [];
    }
  }

  static async getUserMonthlyFull(userId: number, month: string, token?: string) {
    try {
      return await MonthlyReportService.buildMonthlyFull(userId, month, token);
    } catch (err) {
      logger.error('getUserMonthlyFull', err);
      return { success: false, message: 'Internal error' };
    }
  }

  static async getUserMonthlyAttendance(userId: number, month: string, token?: string) {
    return AttendanceCalculationService.getUserMonthlyAttendance(userId, month, token);
  }

  static async approveMonthlyAttendance(userId: number, month: string) {
    // Approval flow disabled in this trimmed service. Return informative error for callers.
    console.warn(`approveMonthlyAttendance called but approval flow is disabled. userId=${userId} month=${month}`);
    return {
      success: false,
      message: 'Approval flow is disabled in this deployment. Use admin backend to approve.'
    };
  }

  /**
   * Bulk approve monthly summaries for given userIds and month.
   * Returns number of records updated.
   */
  static async bulkApproveMonthly(userIds: number[], month: string, approverId?: number) {
    if (!userIds || userIds.length === 0) return { updated: 0 };
    const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
    try {
      const updated = await MonthlySummaryModel.query()
        .whereIn('userId', userIds)
        .andWhere('month', targetMonth)
        .patch({ isApproved: true, approvedBy: (approverId || null) as any, approvedAt: new Date().toISOString() });
      return { updated: Number(updated || 0) };
    } catch (err) {
      logger.error('bulkApproveMonthly error', err);
      return { updated: 0, error: String(err) };
    }
  }

  /**
   * Bulk approve by monthly_attendances record IDs (primary key ids)
   */
  static async bulkApproveByRecordIds(ids: number[], approverId?: number) {
    if (!ids || ids.length === 0) return { updated: 0 };
    try {
      const updated = await MonthlySummaryModel.query()
        .whereIn('id', ids)
        .patch({
          isApproved: true,
          approvedBy: (approverId || null) as any,
          approvedAt: new Date().toISOString()
        });
      return { updated: Number(updated || 0) };
    } catch (err) {
      logger.error('bulkApproveByRecordIds error', err);
      return { updated: 0, error: String(err) };
    }
  }

  static async recordAttendance(userId: number, time: string, token?: string) {
    return AttendanceRecordService.recordAttendance(userId, time, token);
  }
}
