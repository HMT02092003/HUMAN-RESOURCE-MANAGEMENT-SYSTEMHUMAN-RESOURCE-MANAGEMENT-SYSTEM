import { Request, Response, NextFunction } from 'express';
import EmployeeSalaryProfile from '../Model/EmployeeSalaryProfile';
import EmployeeSalaryProfileAllowance from '../Model/EmployeeSalaryProfileAllowance';
import AllowanceType from '../Model/AllowanceType';
import MonthlyPayslip from '../Model/MonthlyPayslip';
import axios from 'axios';
import SettingsService from '../services/SettingsService';
import PayslipCalculationService from '../services/payslipCalculationService';

export const generateFromProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    // check existing payslip for user/month
    const existing = await MonthlyPayslip.query().findOne({ user_id: userId, year, month });
    if (existing) return res.status(400).json({ message: 'Payslip already exists for this user/month' });

    // load profile with allowances
    const profile = await EmployeeSalaryProfile.query().findOne({ user_id: userId }).withGraphFetched('allowances.[allowanceType]');
    if (!profile) return res.status(404).json({ message: 'Salary profile not found' });

    // compute allowances
    const allowanceEntries = (profile as any).allowances || [];
    let allowancesSum = 0;
    const payslipAllowanceRows: any[] = [];

    for (const a of allowanceEntries) {
      let amount = 0;
      if (a.amount != null) amount = Number(a.amount);
      else if (a.allowanceType && a.allowanceType.default_amount != null) amount = Number(a.allowanceType.default_amount);
      allowancesSum += amount;
      payslipAllowanceRows.push({
        employee_salary_profile_allowance_id: a.id || null,
        amount: amount,
        name_snapshot: a.allowanceType?.name || null,
      });
    }

    const baseSalary = Number(profile.base_salary || 0);

    // create monthly payslip (no separate allowances table in this DB schema)
    const created = await MonthlyPayslip.query().insert({
      user_id: userId,
      year,
      month,
      base_salary: String(baseSalary),
      allowances: String(allowancesSum),
      gross_salary: String(Number(baseSalary) + Number(allowancesSum)),
      net_salary: String(Number(baseSalary) + Number(allowancesSum)),
      status: 'draft'
    } as any).returning('*');

    res.status(201).json(created);
  } catch (err: any) {
    next(err);
  }
};

/**
 * Generate payslip using attendance-service monthly-full payload.
 * POST /payslips/generate-from-attendance/:userId?year=YYYY&month=M
 */
export const generateFromAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    // prevent duplicate
    const existing = await MonthlyPayslip.query().findOne({ user_id: userId, year, month });
    if (existing) return res.status(400).json({ message: 'Payslip already exists for this user/month' });

    // call attendance service monthly-full
    const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const resp = await axios.get(`${apiGateway}/api/user/${userId}/monthly-full`, { params: { year, month } });
    if (!resp.data || !resp.data.data) return res.status(404).json({ message: 'Attendance monthly data not found' });

    const { monthlyStats } = resp.data.data as any;

    // load salary profile
    const profile = await EmployeeSalaryProfile.query().findOne({ user_id: userId });
    const baseSalary = Number(profile?.base_salary || 0);

    // load penalty settings (fallbacks)
    let penaltyRate = 0;
    try {
      const pen = await SettingsService.getSettingValue('PenaltyRate');
      if (pen && typeof pen === 'object' && pen.rate) penaltyRate = Number(pen.rate || 0);
    } catch (e) { /* ignore */ }

    // compute unauthorized absence penalty per day: round(baseSalary / totalScheduledDays)
    const totalScheduledDays = Number(monthlyStats.totalDays || monthlyStats.totalScheduledDays || 0) || 0;
    const unauthorizedAbsencePenaltyPerDay = totalScheduledDays ? Math.round(baseSalary / totalScheduledDays) : 0;

    const totalUnauthorizedAbsencePenalty = monthlyStats.unauthorizedAbsenceDays ? Number(monthlyStats.unauthorizedAbsenceDays) * unauthorizedAbsencePenaltyPerDay : 0;

    // total penalties: prefer precomputed monthlyStats totals if present
    const totalLatePenalty = Number(monthlyStats.totalLatePenalty || 0);
    const totalEarlyLeavePenalty = Number(monthlyStats.totalEarlyLeavePenalty || 0);
    const totalPenalty = Math.round(totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty);

    // compute gross and net
  let allowancesSum = 0;
  try {
    const allowanceRows = await EmployeeSalaryProfileAllowance.query().where('employee_salary_profile_id', profile?.id || -1).select('allowance_type_id');
    const atIds = allowanceRows.map((r: any) => Number(r.allowance_type_id)).filter(Boolean);
    if (atIds.length > 0) {
      const types = await AllowanceType.query().whereIn('id', atIds).select('id', 'default_amount');
      const map = new Map<number, number>();
      for (const t of types) map.set(Number(t.id), Number(t.default_amount || 0));
      allowancesSum = atIds.reduce((s: number, id: number) => s + (map.get(id) || 0), 0);
    }
  } catch (e: any) {
    console.error('[salary-service] error computing allowances in controller generateFromAttendance:', e?.message || e);
  }

    const gross = baseSalary + allowancesSum + Number(monthlyStats.totalOvertimePay || monthlyStats.totalOvertimeSalary || 0);

    // insurance settings
    let socialInsurance = 0, healthInsurance = 0, unemploymentInsurance = 0;
    try {
      const bh = await SettingsService.getSettingValue('BHRates');
      if (bh && typeof bh === 'object') {
        const insBase = Number((profile as any)?.insurance_salary || baseSalary) || baseSalary;
        socialInsurance = Math.round((Number(bh.social || 0) / 100) * insBase);
        healthInsurance = Math.round((Number(bh.health || 0) / 100) * insBase);
        unemploymentInsurance = Math.round((Number(bh.unemployment || 0) / 100) * insBase);
      }
    } catch (e) { /* ignore */ }

    const totalDeductions = socialInsurance + healthInsurance + unemploymentInsurance + totalPenalty;

    const net = Math.round(gross - totalDeductions);

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const created = await MonthlyPayslip.query().insert({
      user_id: userId,
      year,
      month,
      // convert numeric monetary values to string to satisfy jsonSchema
      base_salary: String(baseSalary),
      allowances: String(allowancesSum),
      gross_salary: String(gross),
      social_insurance: String(socialInsurance),
      health_insurance: String(healthInsurance),
      penalty_total: String(totalPenalty),
      total_deductions: String(totalDeductions),
      net_salary: String(net),
      // don't write columns removed by recent migration (period_start/period_end, unemployment_insurance,
      // working_days, actual_working_days, overtime_hours, attendance_summary)
      status: 'draft'
    } as any).returning('*');

    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    next(err);
  }
};

/**
 * Calculate payslips in bulk from approved monthly attendance records for a given month.
 * POST /payslips/calculate-from-attendance
 * body: { month: 'YYYY-MM' }
 */
export const calculateFromAttendanceBulk = async (req: Request, res: Response, next: NextFunction) => {
  try {
  const monthStr = String(req.body.month || req.query.month || '');
  const result = await PayslipCalculationService.calculateAndInsertPayslipsForMonth(monthStr);
  if (!result || !result.success) {
    console.error('[salary-service] calculateFromAttendanceBulk failed:', result?.message);
    return res.status(400).json({ success: false, message: result?.message || 'Calculation failed' });
  }
  return res.status(201).json(result);
  } catch (err: any) {
    next(err);
  }
};

// single default export at the end of file

/**
 * Admin helper: list monthly payslips for a given year and month.
 * GET /payslips/admin/list-by-month?year=YYYY&month=MM
 */
export const listPayslipsByMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const rows = await MonthlyPayslip.query().where({ year, month }).orderBy('user_id');
    // Enrich with user info from auth-service
    try {
      const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
      const userIds = [...new Set(rows.map((r: any) => Number(r.user_id)).filter(Boolean))];
      if (userIds.length > 0) {
        const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds });
        const users = (usersResp && usersResp.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : (usersResp && Array.isArray(usersResp.data) ? usersResp.data : []);
        // fetch department names from employee-service for user.departmentId values
        try {
          const deptIds = [...new Set(users.map((u: any) => Number(u.departmentId)).filter(Boolean))];
          const deptMap = new Map<number, string>();
          await Promise.all(deptIds.map(async (did) => {
            try {
              const dresp = await axios.get(`${apiGateway}/api/employee/departments/${did}`);
              if (dresp && dresp.data && dresp.data.success && dresp.data.data) {
                deptMap.set(Number(did), dresp.data.data.name || null);
              } else if (dresp && dresp.data && dresp.data.name) {
                deptMap.set(Number(did), dresp.data.name || null);
              }
            } catch (e: any) {
              console.warn('[salary-service] Failed to fetch department', did, e?.message || e);
            }
          }));

          rows.forEach((row: any) => {
            const u = users.find((x: any) => Number(x.id) === Number(row.user_id));
            row.user = u || null;
            row.username = u ? u.username : null;
            row.fullName = u ? u.fullName || '' : null;
            if (u && u.departmentId) {
              const did = Number(u.departmentId);
              const dname = deptMap.has(did) ? deptMap.get(did) : null;
              row.department = { id: did, name: dname };
              row.departmentName = dname;
              if (row.user) row.user.department = { id: did, name: dname };
            } else {
              row.department = null;
              row.departmentName = null;
            }
          });
        } catch (e: any) {
          // fallback: attach users without department enrichment
          rows.forEach((row: any) => {
            const u = users.find((x: any) => Number(x.id) === Number(row.user_id));
            row.user = u || null;
            row.username = u ? u.username : null;
            row.fullName = u ? (u.fullName || '') : null;
            row.department = null;
            row.departmentName = null;
          });
        }
      }
    } catch (err: any) {
      console.warn('[salary-service] Failed to enrich payslips list with user info:', err?.message || err);
    }

    return res.status(200).json({ success: true, data: rows });
  } catch (err: any) {
    next(err);
  }
};

/**
 * Paginated list of payslips with optional month filter.
 * GET /payslips?month=YYYY-MM&page=0&pageSize=25
 */
export const listPaginatedPayslips = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monthStr = String(req.query.month || '');
    let year: number | undefined;
    let month: number | undefined;
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      const parts = monthStr.split('-').map(Number);
      year = parts[0];
      month = parts[1];
    }

    const page = Math.max(0, Number(req.query.page) || 0);
    const pageSize = Math.max(1, Math.min(1000, Number(req.query.pageSize) || 25));

    const query = MonthlyPayslip.query();
    if (year && month) query.where({ year, month });

    // count total
    const total = await query.resultSize();

    // apply ordering and pagination
    const rows = await query
      .orderBy('year', 'desc')
      .orderBy('month', 'desc')
      .orderBy('user_id')
      .offset(page * pageSize)
      .limit(pageSize);

    // Enrich paginated rows with user info (non-blocking)
    try {
      const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
      const userIds = [...new Set(rows.map((r: any) => Number(r.user_id)).filter(Boolean))];
      if (userIds.length > 0) {
        const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds });
        const users = (usersResp && usersResp.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : (usersResp && Array.isArray(usersResp.data) ? usersResp.data : []);
        // fetch department names for users and attach
        try {
          const deptIds = [...new Set(users.map((u: any) => Number(u.departmentId)).filter(Boolean))];
          const deptMap = new Map<number, string>();
          await Promise.all(deptIds.map(async (did) => {
            try {
              const dresp = await axios.get(`${apiGateway}/api/employee/departments/${did}`);
              if (dresp && dresp.data && dresp.data.success && dresp.data.data) {
                deptMap.set(Number(did), dresp.data.data.name || null);
              } else if (dresp && dresp.data && dresp.data.name) {
                deptMap.set(Number(did), dresp.data.name || null);
              }
            } catch (e: any) {
              console.warn('[salary-service] Failed to fetch department', did, e?.message || e);
            }
          }));

          rows.forEach((row: any) => {
            const u = users.find((x: any) => Number(x.id) === Number(row.user_id));
            row.user = u || null;
            row.username = u ? u.username : null;
            row.fullName = u ? u.fullName || '' : null;
            if (u && u.departmentId) {
              const did = Number(u.departmentId);
              const dname = deptMap.has(did) ? deptMap.get(did) : null;
              row.department = { id: did, name: dname };
              row.departmentName = dname;
              if (row.user) row.user.department = { id: did, name: dname };
            } else {
              row.department = null;
              row.departmentName = null;
            }
          });
        } catch (e: any) {
          rows.forEach((row: any) => {
            const u = users.find((x: any) => Number(x.id) === Number(row.user_id));
            row.user = u || null;
            row.username = u ? u.username : null;
            row.fullName = u ? u.fullName || '' : null;
            row.department = null;
            row.departmentName = null;
          });
        }
      }
    } catch (err: any) {
      console.warn('[salary-service] Failed to enrich paginated payslips with user info:', err?.message || err);
    }

    return res.status(200).json({
      success: true,
      data: rows,
      page,
      pageSize,
      total
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * Get payslips for a single user, optionally filtered by month (YYYY-MM) or year/month query params.
 * GET /auth/users/:userId/payslips?month=YYYY-MM
 */
export const getPayslipsByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const monthStr = String(req.query.month || '');
    let year: number | undefined;
    let month: number | undefined;
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      const parts = monthStr.split('-').map(Number);
      year = parts[0];
      month = parts[1];
    } else {
      year = req.query.year ? Number(req.query.year) : undefined;
      month = req.query.month ? Number(req.query.month) : undefined;
    }

    const query = MonthlyPayslip.query().where('user_id', userId);
    if (year && month) query.andWhere({ year, month });

    const rows = await query.orderBy('year', 'desc').orderBy('month', 'desc');

    // Enrich rows with user info (single user) and department if possible
    try {
      const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
      const userIds = [...new Set(rows.map((r: any) => Number(r.user_id)).filter(Boolean))];
      if (userIds.length > 0) {
        const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds });
        const users = (usersResp && usersResp.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : (usersResp && Array.isArray(usersResp.data) ? usersResp.data : []);

        try {
          const deptIds = [...new Set(users.map((u: any) => Number(u.departmentId)).filter(Boolean))];
          const deptMap = new Map<number, string>();
          await Promise.all(deptIds.map(async (did) => {
            try {
              const dresp = await axios.get(`${apiGateway}/api/employee/departments/${did}`);
              if (dresp && dresp.data && dresp.data.success && dresp.data.data) {
                deptMap.set(Number(did), dresp.data.data.name || null);
              } else if (dresp && dresp.data && dresp.data.name) {
                deptMap.set(Number(did), dresp.data.name || null);
              }
            } catch (e: any) {
              console.warn('[salary-service] Failed to fetch department', did, e?.message || e);
            }
          }));

          rows.forEach((row: any) => {
            const u = users.find((x: any) => Number(x.id) === Number(row.user_id));
            row.user = u || null;
            row.username = u ? u.username : null;
            row.fullName = u ? u.fullName || '' : null;
            if (u && u.departmentId) {
              const did = Number(u.departmentId);
              const dname = deptMap.has(did) ? deptMap.get(did) : null;
              row.department = { id: did, name: dname };
              row.departmentName = dname;
              if (row.user) row.user.department = { id: did, name: dname };
            } else {
              row.department = null;
              row.departmentName = null;
            }
          });
        } catch (e: any) {
          rows.forEach((row: any) => {
            const u = users.find((x: any) => Number(x.id) === Number(row.user_id));
            row.user = u || null;
            row.username = u ? u.username : null;
            row.fullName = u ? u.fullName || '' : null;
            row.department = null;
            row.departmentName = null;
          });
        }
      }
    } catch (err: any) {
      console.warn('[salary-service] Failed to enrich payslips for user with user info:', err?.message || err);
    }

    return res.status(200).json({ success: true, data: rows });
  } catch (err: any) {
    next(err);
  }
};

/**
 * GET /payslips/:id
 * Return a single payslip row enriched with user info and department name if available.
 */
export const getPayslipById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

    const rowRaw = await MonthlyPayslip.query().findById(id);
    if (!rowRaw) return res.status(404).json({ success: false, message: 'Payslip not found' });

    // copy to plain object so we can attach dynamic fields without TS errors
    const row: any = Object.assign({}, rowRaw);

    try {
      const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
      // fetch user info
      const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds: [Number(row.user_id)] });
      const users = (usersResp && usersResp.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : (usersResp && Array.isArray(usersResp.data) ? usersResp.data : []);
      const user = users.length > 0 ? users[0] : null;
      row.user = user || null;
      row.username = user ? user.username : null;
      row.fullName = user ? (user.fullName || '') : null;

      // fetch department name if departmentId present
      if (user && user.departmentId) {
        try {
          const dresp = await axios.get(`${apiGateway}/api/employee/departments/${Number(user.departmentId)}`);
          const dname = dresp && dresp.data && dresp.data.data ? dresp.data.data.name : (dresp && dresp.data && dresp.data.name ? dresp.data.name : null);
          row.department = { id: Number(user.departmentId), name: dname };
          row.departmentName = dname;
          if (row.user) row.user.department = { id: Number(user.departmentId), name: dname };
        } catch (e: any) {
          // ignore department fetch error
          row.department = null;
          row.departmentName = null;
        }
      } else {
        row.department = null;
        row.departmentName = null;
      }
    } catch (e: any) {
      // ignore enrichment errors
    }

    return res.status(200).json({ success: true, data: row });
  } catch (err: any) {
    next(err);
  }
};

/**
 * Get payslips for the authenticated user across months. Uses req.user.id set by auth middleware.
 * GET /payslips/me?month=YYYY-MM
 */
export const getMyPayslips = async (req: Request, res: Response, next: NextFunction) => {
  try {
  const currentUserId = (req as any).user?.id || (req as any).user?.user?.id || null;
    if (!currentUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const monthStr = String(req.query.month || '');
    let year: number | undefined;
    let month: number | undefined;
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      const parts = monthStr.split('-').map(Number);
      year = parts[0];
      month = parts[1];
    } else {
      year = req.query.year ? Number(req.query.year) : undefined;
      month = req.query.month ? Number(req.query.month) : undefined;
    }

    const query = MonthlyPayslip.query().where('user_id', String(currentUserId));
    if (year && month) query.andWhere({ year, month });

    const rows = await query.orderBy('year', 'desc').orderBy('month', 'desc');

    // Enrich with user info (optional, current user only) and fetch department name if available
    try {
      const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
      const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds: [Number(currentUserId)] });
      const users = (usersResp && usersResp.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : [];
      const u = users[0] || null;

      // If user has a departmentId, try to fetch department name from employee service
      let deptName: string | null = null;
      if (u && u.departmentId) {
        try {
          const dresp = await axios.get(`${apiGateway}/api/employee/departments/${Number(u.departmentId)}`);
          if (dresp && dresp.data) {
            if (dresp.data.success && dresp.data.data) deptName = dresp.data.data.name || null;
            else if (dresp.data.name) deptName = dresp.data.name || null;
          }
        } catch (e: any) {
          console.warn('[salary-service] Failed to fetch department for current user', u.departmentId, e?.message || e);
        }
      }

      rows.forEach((row: any) => {
        row.user = u;
        row.username = u ? u.username : null;
        row.fullName = u ? (u.fullName || '') : null;
        if (u && u.departmentId) {
          row.department = { id: Number(u.departmentId), name: deptName };
          row.departmentName = deptName;
          if (row.user) row.user.department = { id: Number(u.departmentId), name: deptName };
        } else {
          row.department = null;
          row.departmentName = null;
        }
      });
    } catch (e: any) {
      // ignore enrichment errors
    }

    return res.status(200).json({ success: true, data: rows });
  } catch (err: any) {
    next(err);
  }
};

export default { generateFromProfile, generateFromAttendance, calculateFromAttendanceBulk, listPayslipsByMonth, listPaginatedPayslips, getPayslipsByUser, getMyPayslips };
