// AttendanceService façade — delegates heavy work to small services
import axios from 'axios';
import os from 'os';
import { MonthlyReportService } from './MonthlyReportService';
import * as AttendanceRecordService from './attendance/AttendanceRecordService';
import AttendanceCalculationService from './attendance/AttendanceCalculationService';
import MonthlySummaryModel from '@/Models/MonthlySummaryModel';

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
   * Simple pattern: call auth-service directly, query DB, enrich with users
   */
  static async getMonthlySummariesByScope(permissionKey: string, req: any, pager?: { page?: number; pageSize?: number; month?: string | undefined }) {
    const page = Math.max(0, (pager?.page || 0));
    const pageSize = Math.min(200, pager?.pageSize || 20);
    const offset = page * pageSize;

    try {
      const token = req.cookies?.token || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
      
      if (!token) {
        const err: any = new Error('Access token required');
        err.status = 401;
        throw err;
      }

      // Call auth-service check-scope directly (like application-service does)
      const AUTH_SERVICE_URL = `http://${getLocalIpAddress()}:${process.env['AUTH_SERVICE_PORT'] || 4001}`;
      const scopeResult = await axios.post(`${AUTH_SERVICE_URL}/api/users/check-scope`, 
        { permissionKey },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 5000 }
      );

      const userIds: number[] = scopeResult?.data?.userIds || [];
      if (!userIds || userIds.length === 0) return { results: [], total: 0, page, pageSize };

      // Query monthly_attendances for those userIds
      const baseQuery = MonthlySummaryModel.query().whereIn('userId', userIds);
      if (pager?.month) baseQuery.andWhere('month', pager.month);

      const [countResult] = await baseQuery.clone().count('* as count') as any;
      const total = Number(countResult.count || 0);
      let results = await baseQuery.clone().orderBy('month', 'desc').limit(pageSize).offset(offset);

      // Enrich with user profiles
      try {
        const usersResp = await axios.post(`${AUTH_SERVICE_URL}/api/users/bulk`, { userIds }, 
          { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
        );
        const users = usersResp?.data?.data || usersResp?.data || [];
        const usersById: Record<number, any> = {};
        for (const u of users) usersById[u.id] = u;
        results = results.map((r: any) => ({ ...r, user: usersById[r.userId] || null }));
      } catch (e: any) {
        logger.error('Failed to enrich users', e?.message || e);
      }

      return { results, total, page, pageSize };
    } catch (err: any) {
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

  static async recordAttendance(userId: number, time: string) {
    return AttendanceRecordService.recordAttendance(userId, time);
  }
}
