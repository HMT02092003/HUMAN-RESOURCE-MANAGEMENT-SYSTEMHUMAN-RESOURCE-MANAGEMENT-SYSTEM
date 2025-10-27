import { Model } from 'objection';
import { createRequire } from 'module';

export class MonthlyPayslip extends Model {
  id!: number;
  user_id!: string;
  year!: number;
  month!: number;
  period_start!: string;
  period_end!: string;
  base_salary!: string;
  allowances?: string;
  overtime_pay?: string;
  bonus?: string;
  other_income?: string;
  gross_salary!: string;
  social_insurance?: string;
  health_insurance?: string;
  unemployment_insurance?: string;
  personal_income_tax?: string;
  total_deductions?: string;
  extra_bonus?: string;
  penalty_total?: string;
  deduction_details?: any;
  net_salary!: string;
  working_days?: number;
  actual_working_days?: number;
  overtime_hours?: string;
  attendance_summary?: any;
  status!: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;

  static tableName = 'monthly_payslips';

  static jsonSchema = {
    type: 'object',
    required: <string[]>['user_id', 'year', 'month'],
    properties: {
      id: { type: 'integer' },
      user_id: { type: 'string' },
      year: { type: 'integer' },
      month: { type: 'integer' },
      period_start: { type: 'string' },
      period_end: { type: 'string' },
      base_salary: { type: 'string' },
      allowances: { type: 'string' },
      overtime_pay: { type: 'string' },
      bonus: { type: 'string' },
      other_income: { type: 'string' },
      gross_salary: { type: 'string' },
      social_insurance: { type: 'string' },
      health_insurance: { type: 'string' },
      unemployment_insurance: { type: 'string' },
      personal_income_tax: { type: 'string' },
      total_deductions: { type: 'string' },
      extra_bonus: { type: 'string' },
      penalty_total: { type: 'string' },
      deduction_details: { type: 'object' },
      net_salary: { type: 'string' },
      working_days: { type: 'integer' },
      actual_working_days: { type: 'integer' },
      overtime_hours: { type: 'string' },
      attendance_summary: { type: 'object' },
      status: { type: 'string' },
      notes: { type: ['string', 'null'] },
      created_at: { type: 'string' },
      updated_at: { type: ['string', 'null'] },
    },
  };

  static get relationMappings(): any {
  const requireFrom = createRequire(import.meta.url);
  const PayslipAllowance = requireFrom('../Model/PayslipAllowance').default;
    return {
      allowancesList: {
        relation: Model.HasManyRelation,
        modelClass: PayslipAllowance,
        join: {
          from: 'monthly_payslips.id',
          to: 'payslip_allowances.monthly_payslip_id',
        },
      },
    };
  }
}

export default MonthlyPayslip;
