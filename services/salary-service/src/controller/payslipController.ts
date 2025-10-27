import { Request, Response, NextFunction } from 'express';
import EmployeeSalaryProfile from '../Model/EmployeeSalaryProfile';
import EmployeeSalaryProfileAllowance from '../Model/EmployeeSalaryProfileAllowance';
import AllowanceType from '../Model/AllowanceType';
import MonthlyPayslip from '../Model/MonthlyPayslip';
import PayslipAllowance from '../Model/PayslipAllowance';

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

    // create monthly payslip
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

  const created = await MonthlyPayslip.query().insert({
      user_id: userId,
      year,
      month,
      period_start: periodStart.toISOString().slice(0,10),
      period_end: periodEnd.toISOString().slice(0,10),
      base_salary: baseSalary,
      allowances: allowancesSum,
      gross_salary: baseSalary + allowancesSum,
      net_salary: baseSalary + allowancesSum, // further deductions not computed here
      status: 'draft'
  } as any).returning('*');

    // insert payslip allowances
    for (const r of payslipAllowanceRows) {
      await PayslipAllowance.query().insert({
        monthly_payslip_id: created.id,
        employee_salary_profile_allowance_id: r.employee_salary_profile_allowance_id,
        amount: r.amount,
        name_snapshot: r.name_snapshot,
      } as any);
    }

    const result = await MonthlyPayslip.query().findById(created.id).withGraphFetched('allowancesList');
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export default { generateFromProfile };
