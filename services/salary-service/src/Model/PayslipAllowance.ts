import { Model } from 'objection';
import { createRequire } from 'module';

export class PayslipAllowance extends Model {
  id!: number;
  monthly_payslip_id!: number;
  allowance_type_id?: number | null;
  employee_salary_profile_allowance_id?: number | null;
  amount!: string;
  name_snapshot?: string | null;
  created_at?: string;
  updated_at?: string | null;

  static tableName = 'payslip_allowances';

  static jsonSchema = {
    type: 'object',
    required: <string[]>['monthly_payslip_id', 'amount'],
    properties: {
      id: { type: 'integer' },
      monthly_payslip_id: { type: 'integer' },
  allowance_type_id: { type: ['integer', 'null'] },
  employee_salary_profile_allowance_id: { type: ['integer', 'null'] },
      amount: { type: 'string' },
      name_snapshot: { type: ['string', 'null'] },
      created_at: { type: 'string' },
      updated_at: { type: ['string', 'null'] },
    },
  };

  static get relationMappings(): any {
    const requireFrom = createRequire(import.meta.url);
    const MonthlyPayslip = requireFrom('../Model/MonthlyPayslip').default;
    const AllowanceType = requireFrom('../Model/AllowanceType').default;
      const EmployeeSalaryProfileAllowance = requireFrom('../Model/EmployeeSalaryProfileAllowance').default;
    return {
      monthlyPayslip: {
        relation: Model.BelongsToOneRelation,
        modelClass: MonthlyPayslip,
        join: {
          from: 'payslip_allowances.monthly_payslip_id',
          to: 'monthly_payslips.id',
        },
      },
      allowanceType: {
        relation: Model.BelongsToOneRelation,
        modelClass: AllowanceType,
        join: {
          from: 'payslip_allowances.allowance_type_id',
          to: 'allowance_types.id',
        },
      },
        employeeSalaryProfileAllowance: {
          relation: Model.BelongsToOneRelation,
          modelClass: EmployeeSalaryProfileAllowance,
          join: {
            from: 'payslip_allowances.employee_salary_profile_allowance_id',
            to: 'employee_salary_profile_allowances.id',
          },
        },
    };
  }
}

export default PayslipAllowance;
