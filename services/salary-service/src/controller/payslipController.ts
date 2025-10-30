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
  } catch (err) {
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
  } catch (e) {
    console.error('[salary-service] error computing allowances in controller generateFromAttendance:', e && e.message ? e.message : e);
  }

    const gross = baseSalary + allowancesSum + Number(monthlyStats.totalOvertimePay || monthlyStats.totalOvertimeSalary || 0);

    // insurance settings
    let socialInsurance = 0, healthInsurance = 0, unemploymentInsurance = 0;
    try {
      const bh = await SettingsService.getSettingValue('BHRates');
      if (bh && typeof bh === 'object') {
        const insBase = Number(profile?.insurance_salary || baseSalary) || baseSalary;
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
  } catch (err) {
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
  } catch (err) {
    next(err);
  }
};

export default { generateFromProfile, calculateFromAttendanceBulk };

/**
 * Admin helper: list monthly payslips for a given year and month.
 * GET /payslips/admin/list-by-month?year=YYYY&month=MM
 */
export const listPayslipsByMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const rows = await MonthlyPayslip.query().where({ year, month }).orderBy('user_id');
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
