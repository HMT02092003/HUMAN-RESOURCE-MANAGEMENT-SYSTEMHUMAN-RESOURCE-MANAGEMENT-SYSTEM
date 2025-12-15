import { Request, Response, NextFunction } from 'express';
import EmployeeSalaryProfile from '../Model/EmployeeSalaryProfile';
import EmployeeSalaryProfileAllowance from '../Model/EmployeeSalaryProfileAllowance';
import AllowanceType from '../Model/AllowanceType';
import MonthlyPayslip from '../Model/MonthlyPayslip';
import axios from 'axios';
import SettingsService from '../services/SettingsService';
import PayslipCalculationService from '../services/payslipCalculationService';
import CheckScopeService from '../services/CheckScopeService';

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
  // Propagate incoming Authorization header or token cookie so service-to-service calls via API Gateway
  let incomingToken: string | undefined = undefined;
  if (req.headers['authorization']) incomingToken = String(req.headers['authorization']).startsWith('Bearer ') ? String(req.headers['authorization']).substring(7) : String(req.headers['authorization']);
  else if (req.headers['cookie']) {
    const match = (req.headers['cookie'] as string).split(';').map(c => c.trim()).find(c => c.startsWith('token='));
    if (match) incomingToken = match.replace(/^token=/, '');
  }

  const result = await PayslipCalculationService.calculateAndInsertPayslipsForMonth(monthStr, { authToken: incomingToken });
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

// REMOVED: listPayslipsByMonth - now unified into listPaginatedPayslips with full filter/sort support

/**
 * Paginated list of payslips with full server-side search/filter/sort support.
 * GET /payslips?page=1&pageSize=25&allMonths=true&sort=created_at&order=desc&fullName=John
 * Supports filtering on all columns and searching across user-enriched fields.
 */
export const listPaginatedPayslips = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // allMonths: default to true (show all months unless explicitly filtered)
    const allMonthsRaw = req.query.allMonths;
    const allMonths = allMonthsRaw === undefined ? true : (String(allMonthsRaw) === 'true' || String(allMonthsRaw) === '1' || allMonthsRaw === true);
    
    // If frontend explicitly sets allMonths=false or provides month filter, apply month filter
    let year: number | undefined;
    let month: number | undefined;
    let applyMonthFilter = false;
    
    if (!allMonths || req.query.month) {
      const monthStr = req.query.month ? String(req.query.month) : '';
      if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
        const parts = monthStr.split('-').map(Number);
        year = parts[0];
        month = parts[1];
        applyMonthFilter = true;
      } else if (!allMonths) {
        // Default to current month if allMonths=false but no month provided
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
        applyMonthFilter = true;
      }
    }

    console.log('[salary-service] listPaginatedPayslips:', { 
      allMonths,
      year, 
      month, 
      applyMonthFilter,
      page: req.query.page, 
      pageSize: req.query.pageSize 
    });

    // Frontend uses 1-based page, convert to 0-based
    const pageFromFrontend = Math.max(1, Number(req.query.page) || 1);
    const page = pageFromFrontend - 1;
    const pageSize = Math.max(1, Math.min(1000, Number(req.query.pageSize) || 25));

    // Check scope - use 'users' permission key like attendance service
    const token = req.headers['authorization'] || '';
    let scopedUserIds: number[] = [];
    let hasFullAccess = false;
    
    try {
      const scopeResult = await CheckScopeService.checkUserScope('users', token);
      
      console.log('[salary-service] Scope check result:', { 
        hasAccess: scopeResult.hasAccess, 
        userIdsCount: scopeResult.userIds?.length || 0,
        isArray: Array.isArray(scopeResult.userIds)
      });
      
      if (!scopeResult.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem bảng lương'
        });
      }
      
      if (Array.isArray(scopeResult.userIds) && scopeResult.userIds.length > 0) {
        scopedUserIds = scopeResult.userIds.map((u: any) => Number(u)).filter((n: number) => !isNaN(n));
        console.log('[salary-service] Filtered user IDs:', scopedUserIds.length);
      } else if (!scopeResult.userIds || scopeResult.userIds.length === 0) {
        // If hasAccess=true but no userIds, it means full access (admin/CEO)
        hasFullAccess = true;
        console.log('[salary-service] Full access granted (no user restriction)');
      }
    } catch (e) {
      console.error('[salary-service] Error checking scope:', e);
      return res.status(403).json({
        success: false,
        message: 'Không thể kiểm tra quyền truy cập'
      });
    }

    // Build base query with scope filter
    let query = MonthlyPayslip.query();
    
    // Apply month filter if needed
    if (applyMonthFilter && year && month) {
      query = query.where({ year, month });
      console.log('[salary-service] Filtering by year:', year, 'month:', month);
    }
    
    // Only apply user filter if not full access
    if (!hasFullAccess) {
      if (scopedUserIds.length > 0) {
        query = query.whereIn('user_id', scopedUserIds);
        console.log('[salary-service] Filtering by', scopedUserIds.length, 'scoped user IDs');
      } else {
        // No users in scope and not full access - return empty
        console.log('[salary-service] No users in scope, returning empty');
        return res.status(200).json({
          success: true,
          data: [],
          page: pageFromFrontend,
          pageSize,
          total: 0
        });
      }
    }

    // Apply DB field filters (support all numeric and text columns)
    const dbFields = ['year', 'month', 'status', 'base_salary', 'allowances', 'overtime_pay', 
      'gross_salary', 'social_insurance', 'health_insurance', 'personal_income_tax', 
      'total_deductions', 'penalty_total', 'net_salary', 'notes', 'created_at', 'updated_at'];
    
    for (const field of dbFields) {
      const value = req.query[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const trimmedValue = String(value).trim();
        if (field === 'status' || field === 'notes') {
          // Text fields - partial match
          query = query.where(field, 'ilike', `%${trimmedValue}%`);
        } else if (['year', 'month'].includes(field)) {
          // Exact match for year/month
          const numValue = Number(trimmedValue);
          if (!isNaN(numValue)) {
            query = query.where(field, numValue);
          }
        } else if (['base_salary', 'allowances', 'overtime_pay', 'gross_salary', 
                    'social_insurance', 'health_insurance', 'personal_income_tax',
                    'total_deductions', 'penalty_total', 'net_salary'].includes(field)) {
          // Numeric fields - exact match (can be extended to range filters)
          const numValue = Number(trimmedValue);
          if (!isNaN(numValue)) {
            query = query.where(field, numValue);
          }
        } else if (['created_at', 'updated_at'].includes(field)) {
          // Date fields - partial match for now
          query = query.where(field, 'ilike', `%${trimmedValue}%`);
        }
      }
    }

    // Support date range filters for created_at
    const createdFrom = req.query['created_atFrom'];
    const createdTo = req.query['created_atTo'];
    if (createdFrom && String(createdFrom).trim()) {
      query = query.where('created_at', '>=', String(createdFrom));
    }
    if (createdTo && String(createdTo).trim()) {
      const endValue = String(createdTo).includes(' ') ? createdTo : `${createdTo} 23:59:59`;
      query = query.where('created_at', '<=', endValue);
    }

    // Support numeric range filters for fields like base_salary, gross_salary, net_salary, etc.
    const numericFields = ['base_salary', 'allowances', 'overtime_pay', 'gross_salary', 'social_insurance', 'health_insurance', 'personal_income_tax', 'total_deductions', 'penalty_total', 'net_salary'];
    for (const nf of numericFields) {
      const fromKey = `${nf}From`;
      const toKey = `${nf}To`;
      const fromVal = req.query[fromKey];
      const toVal = req.query[toKey];
      if (fromVal !== undefined && String(fromVal).trim() !== '') {
        const numFrom = Number(String(fromVal).trim());
        if (!isNaN(numFrom)) query = query.where(nf, '>=', numFrom);
      }
      if (toVal !== undefined && String(toVal).trim() !== '') {
        const numTo = Number(String(toVal).trim());
        if (!isNaN(numTo)) query = query.where(nf, '<=', numTo);
      }
    }

    // Support month range filters: monthFrom / monthTo (values are dates 'YYYY-MM-DD')
    const monthFromRaw = req.query['monthFrom'];
    const monthToRaw = req.query['monthTo'];
    if (monthFromRaw && monthToRaw) {
      const start = String(monthFromRaw).split('T')[0];
      const end = String(monthToRaw).split('T')[0];
      const sParts = start.split('-').map(Number);
      const eParts = end.split('-').map(Number);
      if (sParts.length >= 2 && eParts.length >= 2) {
        const sY = sParts[0];
        const sM = sParts[1];
        const eY = eParts[0];
        const eM = eParts[1];

        query = query.where(function() {
          // year > sY OR (year = sY AND month >= sM)
          this.where('year', '>', sY).orWhere(function() {
            this.where('year', sY).andWhere('month', '>=', sM);
          });
        }).andWhere(function() {
          // year < eY OR (year = eY AND month <= eM)
          this.where('year', '<', eY).orWhere(function() {
            this.where('year', eY).andWhere('month', '<=', eM);
          });
        });
      }
    }

    // Apply DB-level sorting for DB fields before fetching results
    const sortFieldReq = String(req.query['sort'] || '');
    const sortOrderReq = (String(req.query['order'] || 'desc')).toLowerCase() === 'asc' ? 'asc' : 'desc';
    if (sortFieldReq && dbFields.includes(sortFieldReq)) {
      query = query.orderBy(sortFieldReq, sortOrderReq as 'asc' | 'desc');
    } else {
      // default DB order
      query = query.orderBy('created_at', 'desc');
    }

    // Count total before enrichment
    const total = await query.clone().clearOrder().resultSize();
    console.log('[salary-service] Total payslips found:', total);

    // Fetch ALL matching records for user enrichment and user-field filtering/sorting
    const allRows = await query.clone();
    console.log('[salary-service] Fetched all rows before enrichment:', allRows.length);

    // Enrich ALL rows with user info (needed for user-based filtering and sorting)
    let enrichedRows = allRows;
    try {
      const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
      const userIds = [...new Set(allRows.map((r: any) => Number(r.user_id)).filter(Boolean))];
      if (userIds.length > 0) {
        const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds });
        const users = (usersResp?.data?.data || usersResp?.data || []);
        
        // Fetch department names
        const deptIds = [...new Set(users.map((u: any) => Number(u.departmentId)).filter(Boolean))];
        const deptMap = new Map<number, string>();
        await Promise.all(deptIds.map(async (did) => {
          try {
            const dresp = await axios.get(`${apiGateway}/api/employee/departments/${did}`);
            if (dresp?.data?.success && dresp.data.data) {
              deptMap.set(Number(did), dresp.data.data.name || null);
            } else if (dresp?.data?.name) {
              deptMap.set(Number(did), dresp.data.name || null);
            }
          } catch (e: any) {
            console.warn('[salary-service] Failed to fetch department', did, e?.message || e);
          }
        }));

        enrichedRows = allRows.map((row: any) => {
          const u = users.find((x: any) => Number(x.id) === Number(row.user_id));
          return {
            ...row,
            user: u || null,
            username: u?.username || null,
            fullName: u?.fullName || '',
            department: u?.departmentId ? { id: Number(u.departmentId), name: deptMap.get(Number(u.departmentId)) || null } : null,
            departmentName: u?.departmentId ? deptMap.get(Number(u.departmentId)) || null : null
          };
        });
      }
    } catch (err: any) {
      console.warn('[salary-service] Failed to enrich payslips with user info:', err?.message || err);
    }

    // Apply user-field filters (fullName, username, departmentName)
    const fullNameFilter = req.query['fullName'];
    const usernameFilter = req.query['username'];
    const departmentNameFilter = req.query['departmentName'];

    if (fullNameFilter || usernameFilter || departmentNameFilter) {
      enrichedRows = enrichedRows.filter((row: any) => {
        if (fullNameFilter && String(fullNameFilter).trim()) {
          const fullName = row.fullName || '';
          if (!String(fullName).toLowerCase().includes(String(fullNameFilter).trim().toLowerCase())) {
            return false;
          }
        }
        if (usernameFilter && String(usernameFilter).trim()) {
          const username = row.username || '';
          if (!String(username).toLowerCase().includes(String(usernameFilter).trim().toLowerCase())) {
            return false;
          }
        }
        if (departmentNameFilter && String(departmentNameFilter).trim()) {
          const deptName = row.departmentName || '';
          if (!String(deptName).toLowerCase().includes(String(departmentNameFilter).trim().toLowerCase())) {
            return false;
          }
        }
        return true;
      });
      console.log('[salary-service] After user filters, rows:', enrichedRows.length);
    }

    // Apply sorting (DB fields already sorted, user fields need in-memory sort)
    const sortField = req.query['sort'];
    const sortOrder = (req.query['order'] || 'desc') as 'asc' | 'desc';
    const userEnrichedFields = ['fullName', 'username', 'departmentName'];
    
    if (sortField && userEnrichedFields.includes(String(sortField))) {
      enrichedRows.sort((a: any, b: any) => {
        const aVal = a[String(sortField)] || '';
        const bVal = b[String(sortField)] || '';
        const cmp = String(aVal).localeCompare(String(bVal), 'vi', { sensitivity: 'base' });
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (!sortField || !['year', 'month', 'base_salary', 'net_salary', 'gross_salary', 'created_at'].includes(String(sortField))) {
      // Default sort by created_at desc if no valid sort field
      enrichedRows.sort((a: any, b: any) => {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate;
      });
    }

    // Recalculate total after user filtering
    const totalAfterFiltering = enrichedRows.length;

    // Apply pagination AFTER enrichment, filtering, and sorting
    const offset = page * pageSize;
    const paginatedRows = enrichedRows.slice(offset, offset + pageSize);

    console.log('[salary-service] Returning:', {
      total: totalAfterFiltering,
      page: pageFromFrontend,
      pageSize,
      returned: paginatedRows.length
    });

    return res.status(200).json({
      success: true,
      data: paginatedRows,
      page: pageFromFrontend,
      pageSize,
      total: totalAfterFiltering
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
    // Support paginated/predicate query params when called from ServerSideTable
    const pageFromFrontend = Math.max(1, Number(req.query.page) || 1);
    const page = Math.max(0, pageFromFrontend - 1);
    const pageSize = Math.max(1, Math.min(1000, Number(req.query.pageSize) || Number(req.query.limit) || 25));

    // Build base query for current user
    let query = MonthlyPayslip.query().where('user_id', String(currentUserId));

    // Month filter if provided as YYYY-MM or year/month
    const monthStr = String(req.query.month || '');
    let year: number | undefined;
    let month: number | undefined;
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      const parts = monthStr.split('-').map(Number);
      year = parts[0];
      month = parts[1];
      query = query.where({ year, month });
    } else {
      year = req.query.year ? Number(req.query.year) : undefined;
      month = req.query.month ? Number(req.query.month) : undefined;
      if (year && month) query = query.where({ year, month });
    }

    // DB fields available for direct filtering
    const dbFields = ['year', 'month', 'status', 'base_salary', 'allowances', 'overtime_pay', 
      'gross_salary', 'social_insurance', 'health_insurance', 'personal_income_tax', 
      'total_deductions', 'penalty_total', 'net_salary', 'notes', 'created_at', 'updated_at'];

    for (const field of dbFields) {
      const value = req.query[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const trimmedValue = String(value).trim();
        if (field === 'status' || field === 'notes') {
          query = query.where(field, 'ilike', `%${trimmedValue}%`);
        } else if (['year', 'month'].includes(field)) {
          const numValue = Number(trimmedValue);
          if (!isNaN(numValue)) query = query.where(field, numValue);
        } else if (['base_salary', 'allowances', 'overtime_pay', 'gross_salary', 
                    'social_insurance', 'health_insurance', 'personal_income_tax',
                    'total_deductions', 'penalty_total', 'net_salary'].includes(field)) {
          const numValue = Number(trimmedValue);
          if (!isNaN(numValue)) query = query.where(field, numValue);
        } else if (['created_at', 'updated_at'].includes(field)) {
          query = query.where(field, 'ilike', `%${trimmedValue}%`);
        }
      }
    }

    // created_at from/to
    const createdFrom = req.query['created_atFrom'];
    const createdTo = req.query['created_atTo'];
    if (createdFrom && String(createdFrom).trim()) {
      query = query.where('created_at', '>=', String(createdFrom));
    }
    if (createdTo && String(createdTo).trim()) {
      const endValue = String(createdTo).includes(' ') ? createdTo : `${createdTo} 23:59:59`;
      query = query.where('created_at', '<=', endValue);
    }

    // numeric ranges
    const numericFields = ['base_salary', 'allowances', 'overtime_pay', 'gross_salary', 'social_insurance', 'health_insurance', 'personal_income_tax', 'total_deductions', 'penalty_total', 'net_salary'];
    for (const nf of numericFields) {
      const fromKey = `${nf}From`;
      const toKey = `${nf}To`;
      const fromVal = req.query[fromKey];
      const toVal = req.query[toKey];
      if (fromVal !== undefined && String(fromVal).trim() !== '') {
        const numFrom = Number(String(fromVal).trim());
        if (!isNaN(numFrom)) query = query.where(nf, '>=', numFrom);
      }
      if (toVal !== undefined && String(toVal).trim() !== '') {
        const numTo = Number(String(toVal).trim());
        if (!isNaN(numTo)) query = query.where(nf, '<=', numTo);
      }
    }

    // monthFrom/monthTo range support
    const monthFromRaw = req.query['monthFrom'];
    const monthToRaw = req.query['monthTo'];
    if (monthFromRaw && monthToRaw) {
      const start = String(monthFromRaw).split('T')[0];
      const end = String(monthToRaw).split('T')[0];
      const sParts = start.split('-').map(Number);
      const eParts = end.split('-').map(Number);
      if (sParts.length >= 2 && eParts.length >= 2) {
        const sY = sParts[0];
        const sM = sParts[1];
        const eY = eParts[0];
        const eM = eParts[1];

        query = query.where(function() {
          this.where('year', '>', sY).orWhere(function() {
            this.where('year', sY).andWhere('month', '>=', sM);
          });
        }).andWhere(function() {
          this.where('year', '<', eY).orWhere(function() {
            this.where('year', eY).andWhere('month', '<=', eM);
          });
        });
      }
    }

    // Sorting - support DB fields
    const sortFieldReq = String(req.query['sort'] || '');
    const sortOrderReq = (String(req.query['order'] || 'desc')).toLowerCase() === 'asc' ? 'asc' : 'desc';
    if (sortFieldReq && dbFields.includes(sortFieldReq)) {
      query = query.orderBy(sortFieldReq, sortOrderReq as 'asc' | 'desc');
    } else {
      query = query.orderBy('created_at', 'desc');
    }

    const total = await query.clone().clearOrder().resultSize();
    const rows = await query.offset(page * pageSize).limit(pageSize);

    // Enrich with current user info (single user) for consistency
    try {
      const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;
      const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds: [Number(currentUserId)] });
      const users = (usersResp && usersResp.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : [];
      const u = users[0] || null;
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

    return res.status(200).json({ success: true, data: rows, page: pageFromFrontend, pageSize, total });
  } catch (err: any) {
    next(err);
  }
};

export default { generateFromProfile, generateFromAttendance, calculateFromAttendanceBulk, listPaginatedPayslips, getPayslipsByUser, getMyPayslips, getPayslipById };
