// AttendanceService façade — delegates heavy work to small services
import axios from 'axios';
import os from 'os';
import { MonthlyReportService } from './MonthlyReportService';
import * as AttendanceQueryService from './AttendanceQueryService';
// Approval service intentionally not used in trimmed deployment.
import * as AttendanceRecordService from './AttendanceRecordService';

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
    return AttendanceQueryService.getUserMonthlyAttendance(userId, month, token);
  }

  static async approveMonthlyAttendance(userId: number, month: string) {
    // Approval flow disabled in this trimmed service. Return informative error for callers.
    console.warn(`approveMonthlyAttendance called but approval flow is disabled. userId=${userId} month=${month}`);
    return {
      success: false,
      message: 'Approval flow is disabled in this deployment. Use admin backend to approve.'
    };
  }

  static async recordAttendance(userId: number, time: string) {
    return AttendanceRecordService.recordAttendance(userId, time);
  }
}
