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
import CheckScopeService from './CheckScopeService';

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
   * Supports server-side filtering, sorting, and searching using ObjectionJS
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

    // allMonths: treat as true by default when not provided by frontend
    const allMonthsRaw = pager?.['allMonths'];
    const allMonths = allMonthsRaw === undefined ? true : (String(allMonthsRaw) === 'true' || String(allMonthsRaw) === '1' || allMonthsRaw === true);
    // If frontend explicitly requests NOT all months, enforce a month filter (use provided month or default to current month)
    if (!allMonths) {
      if (pager && !pager.month) {
        pager.month = new Date().toISOString().slice(0, 7); // default to current YYYY-MM
      }
    }

    try {
      const token = req.cookies?.token || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
      const rawXUser = req.headers?.['x-user-data'] || req.headers?.['x-user-data'.toLowerCase()];

      if (!token && !rawXUser) {
        const err: any = new Error('Access token required');
        err.status = 401;
        throw err;
      }

      const AUTH_SERVICE_URL = `http://${getLocalIpAddress()}:${process.env['AUTH_SERVICE_PORT'] || 4001}`;

      // Step 1: Get scope userIds from check-scope
      // Forward gateway injected user-data header if present so auth-service accepts the call
      const forwardedUserData = req.headers['x-user-data'] || req.headers['x-user-data'.toLowerCase()];
      const scopeHeaders: any = { 'Content-Type': 'application/json' };
      if (token) scopeHeaders['Authorization'] = `Bearer ${token}`;
      if (forwardedUserData) scopeHeaders['x-user-data'] = forwardedUserData as string;

      console.log('[AttendanceService] Calling Auth Service /api/users/check-scope with headers:', scopeHeaders);
      const scopeResult = await axios.post(`${AUTH_SERVICE_URL}/api/users/check-scope`,
        { permissionKey },
        { headers: scopeHeaders, timeout: 5000 }
      );

      let allowedUserIds: number[] = scopeResult?.data?.userIds || [];
      console.log('[AttendanceService] Scope userIds count:', allowedUserIds.length);

      if (allowedUserIds.length === 0) {
        return { results: [], total: 0, page, pageSize };
      }

      // Step 2: Exclude current user
      let currentUserId: number | null = null;
      try {
        if (token) {
          const decoded: any = getDecodedToken(token);
          if (decoded?.user?.id) currentUserId = Number(decoded.user.id);
        } else if (rawXUser) {
          try {
            const decodedHeader = JSON.parse(Buffer.from(String(rawXUser), 'base64').toString('utf8'));
            const maybeId = decodedHeader?.id ?? decodedHeader?.sub ?? decodedHeader?.user?.id;
            if (maybeId != null) currentUserId = Number(maybeId);
          } catch (e) {
            // ignore
          }
        }
      } catch (dErr) {
        logger.error('Failed to decode token/header', String((dErr as any)?.message || dErr));
      }

      if (currentUserId) {
        allowedUserIds = allowedUserIds.filter(id => id !== currentUserId);
      }

      if (allowedUserIds.length === 0) {
        return { results: [], total: 0, page, pageSize };
      }

      // Step 3: Fetch ALL user details for enrichment (needed for filtering/sorting)
      let usersById: Record<number, any> = {};
      try {
        const bulkHeaders: any = { 'Content-Type': 'application/json' };
        if (token) bulkHeaders['Authorization'] = `Bearer ${token}`;
        if (forwardedUserData) bulkHeaders['x-user-data'] = forwardedUserData as string;

        console.log('[AttendanceService] Calling Auth Service /api/users/bulk with headers:', bulkHeaders, 'userIdsCount=', allowedUserIds.length);
        const usersResp = await axios.post(`${AUTH_SERVICE_URL}/api/users/bulk`,
          { userIds: allowedUserIds },
          { headers: bulkHeaders, timeout: 10000 }
        );
        const users = usersResp?.data?.data || usersResp?.data || [];
        for (const u of users) {
          usersById[u.id] = {
            ...u,
            fullName: u.fullName || u.full_name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            departmentName: u.department?.name || u.Department?.name || null
          };
        }
      } catch (e: any) {
        console.error('[AttendanceService] Error fetching users:', e.message);
      }

      // Step 4: Filter allowedUserIds by user fields if provided
      const fullNameFilter = pager?.['fullName'];
      const usernameFilter = pager?.['username'];
      const departmentNameFilter = pager?.['departmentName'];

      if (fullNameFilter || usernameFilter || departmentNameFilter) {
        const filteredIds = allowedUserIds.filter(uid => {
          const user = usersById[uid];
          if (!user) return false;

          // Check fullName
          if (fullNameFilter && String(fullNameFilter).trim()) {
            const fullName = user.fullName || '';
            if (!String(fullName).toLowerCase().includes(String(fullNameFilter).trim().toLowerCase())) {
              return false;
            }
          }

          // Check username
          if (usernameFilter && String(usernameFilter).trim()) {
            const username = user.username || '';
            if (!String(username).toLowerCase().includes(String(usernameFilter).trim().toLowerCase())) {
              return false;
            }
          }

          // Check departmentName
          if (departmentNameFilter && String(departmentNameFilter).trim()) {
            const deptName = user.departmentName || '';
            if (!String(deptName).toLowerCase().includes(String(departmentNameFilter).trim().toLowerCase())) {
              return false;
            }
          }

          return true;
        });

        allowedUserIds = filteredIds;

        console.log('[AttendanceService] After user filters:', {
          original: Object.keys(usersById).length,
          filtered: allowedUserIds.length
        });

        if (allowedUserIds.length === 0) {
          return { results: [], total: 0, page, pageSize };
        }
      }

      // Step 5: Build base query with ObjectionJS
      const baseQuery = MonthlySummaryModel.query().whereIn('userId', allowedUserIds);

      // Apply filters for DB fields only
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
            // Only apply month filter if frontend asked for a specific month OR explicitly set allMonths=false
            if (!allMonths || trimmedValue) {
              baseQuery.where(field, 'ilike', `%${trimmedValue}%`);
            }
          } else if (['totalScheduledDays', 'presentDays', 'absentDays', 'approvedLeaveDays', 
                      'unauthorizedAbsenceDays', 'businessTripDays', 'lateDays', 'earlyLeaveDays',
                      'totalLateMinutes', 'totalEarlyLeaveMinutes', 'totalWorkHours', 'averageWorkHours',
                      'totalWorkingUnits', 'totalOvertimeHours', 'totalOtWorkingUnits', 'totalOvertimeSalary',
                      'totalLatePenalty', 'totalEarlyLeavePenalty', 'totalUnauthorizedAbsencePenalty', 'totalPenalty'].includes(field)) {
            // Numeric fields - exact match or range
            const numValue = Number(trimmedValue);
            if (!isNaN(numValue)) {
              baseQuery.where(field, numValue);
            }
          } else {
            baseQuery.where(field, 'ilike', `%${trimmedValue}%`);
          }
        }
      }

      // Support created_at range filters explicitly if provided
      const createdFrom = pager?.['created_atFrom'];
      const createdTo = pager?.['created_atTo'];
      if (createdFrom && String(createdFrom).trim()) {
        baseQuery.where('created_at', '>=', String(createdFrom));
      }
      if (createdTo && String(createdTo).trim()) {
        const endValue = String(createdTo).includes(' ') ? createdTo : `${createdTo} 23:59:59`;
        baseQuery.where('created_at', '<=', endValue);
      }

      // Step 6: Apply sorting (DB fields only in query)
      const userEnrichedFields = ['fullName', 'username', 'departmentName'];
      const needsInMemorySort = sortField && userEnrichedFields.includes(sortField);
      
      if (sortField && !needsInMemorySort && dbFields.includes(sortField)) {
        baseQuery.orderBy(sortField, sortOrder);
      } else if (!needsInMemorySort) {
        // Default sort by month desc if no user-enriched sort needed
        baseQuery.orderBy('month', 'desc');
      }

      // Step 7: Count total matching records
      const countQuery: any = baseQuery.clone();
      if (typeof countQuery.clearOrder === 'function') {
        countQuery.clearOrder();
      } else if (typeof countQuery.clearOrders === 'function') {
        countQuery.clearOrders();
      }
      const [countResult] = await countQuery.count('* as count') as any;
      const total = Number(countResult.count || 0);

      // Step 8: Fetch ALL matching results (no pagination yet)
      let allResults = await baseQuery.clone();

      console.log('[AttendanceService] DB query results (before pagination):', {
        total,
        fetched: allResults.length
      });

      // Step 9: Enrich ALL results with user data
      allResults = allResults.map((r: any) => {
        const user = usersById[r.userId] || null;
        return {
          ...r,
          user: user,
          username: user?.username || null,
          fullName: user?.fullName || null,
          departmentId: user?.departmentId || user?.department_id || null,
          departmentName: user?.departmentName || null,
          chevronId: user?.chevronId || user?.chevron_id || null
        };
      });

      // Step 10: Apply in-memory sorting for user-enriched fields if needed
      if (needsInMemorySort && sortField) {
        allResults.sort((a: any, b: any) => {
          const aVal = a[sortField] || '';
          const bVal = b[sortField] || '';
          const cmp = String(aVal).localeCompare(String(bVal), 'vi', { sensitivity: 'base' });
          return sortOrder === 'asc' ? cmp : -cmp;
        });
      }

      // Step 11: Apply pagination AFTER sorting and enrichment (using ObjectionJS page method concept)
      const offset = page * pageSize;
      const results = allResults.slice(offset, offset + pageSize);

      console.log('[AttendanceService] Final results:', {
        total,
        page,
        pageSize,
        returned: results.length
      });

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

  static async getUserMonthlyFull(userId: number, month: string, token?: string, userData?: any) {
    try {
      return await MonthlyReportService.buildMonthlyFull(userId, month, token, userData);
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

  /**
   * Approve all monthly attendances for a specific month (with scope check)
   * Only approves records within user's permission scope
   */
  static async approveAllByMonth(month: string, token: string, approverId?: number) {
    try {
      // Check user's scope
      const scopeResult = await CheckScopeService.checkUserScope('timeAttendance', token);
      
      if (!scopeResult.hasAccess) {
        throw new Error('Bạn không có quyền duyệt bảng chấm công');
      }

      let query = MonthlySummaryModel.query()
        .where('month', month)
        .where('isApproved', false);

      // Apply user scope filter if not full access
      let hasFullAccess = false;
      let scopedUserIds: number[] = [];

      if (Array.isArray(scopeResult.userIds) && scopeResult.userIds.length > 0) {
        scopedUserIds = scopeResult.userIds.map((u: any) => Number(u)).filter((n: number) => !isNaN(n));
        query = query.whereIn('userId', scopedUserIds);
        console.log(`[AttendanceService] Approving for ${scopedUserIds.length} scoped users`);
      } else if (!scopeResult.userIds || scopeResult.userIds.length === 0) {
        hasFullAccess = true;
        console.log('[AttendanceService] Full access - approving all users');
      }

      // Get all records to approve
      const recordsToApprove = await query;
      
      if (recordsToApprove.length === 0) {
        return { approved: 0, message: 'Không có bảng chấm công nào cần duyệt' };
      }

      // Bulk approve using whereIn with IDs
      const idsToApprove = recordsToApprove.map(r => r.id);
      const updated = await MonthlySummaryModel.query()
        .whereIn('id', idsToApprove)
        .patch({
          isApproved: true,
          approvedBy: (approverId || null) as any,
          approvedAt: new Date().toISOString()
        });

      console.log(`[AttendanceService] Approved ${updated} records for month ${month}`);
      
      return { 
        approved: Number(updated || 0),
        total: recordsToApprove.length,
        scopedUsers: scopedUserIds.length,
        hasFullAccess
      };
    } catch (err) {
      logger.error('approveAllByMonth error', err);
      throw err;
    }
  }

  static async recordAttendance(userId: number, time: string, token?: string, userData?: any) {
    return AttendanceRecordService.recordAttendance(userId, time, token, userData);
  }
}
