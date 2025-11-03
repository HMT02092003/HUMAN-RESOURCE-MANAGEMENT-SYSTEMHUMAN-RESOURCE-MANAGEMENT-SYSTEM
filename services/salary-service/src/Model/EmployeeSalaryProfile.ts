import { Model } from 'objection';
import { createRequire } from 'module';

export class EmployeeSalaryProfile extends Model {
  id!: number;
  user_id!: string;
  contract_id?: number | null;
  base_salary!: string;
  created_at?: string;
  updated_at?: string | null;

  // Relations
  allowances?: any[];

  static tableName = 'employee_salary_profiles';

  static jsonSchema = {
    type: 'object',
    required: ['user_id', 'base_salary'],
    properties: {
      id: { type: 'integer' },
      user_id: { type: 'string' },
      contract_id: { type: ['integer', 'null'] },
      base_salary: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: ['string', 'null'], format: 'date-time' },
    },
  };

  static get relationMappings() {
    const requireFrom = createRequire(import.meta.url);
    const EmployeeSalaryProfileAllowance = requireFrom('./EmployeeSalaryProfileAllowance').default;
    
    return {
      allowances: {
        relation: Model.HasManyRelation,
        modelClass: EmployeeSalaryProfileAllowance,
        join: {
          from: 'employee_salary_profiles.id',
          to: 'employee_salary_profile_allowances.employee_salary_profile_id',
        },
      },
    };
  }

  // Add index hints for better query performance
  static get modifiers() {
    return {
      selectActive(builder: any) {
        builder.where('is_active', true);
      },
      orderByEffectiveDate(builder: any) {
        builder.orderBy('effective_from', 'desc');
      },
      forUser(builder: any, userId: string) {
        builder.where('user_id', userId);
      },
    };
  }
}

export default EmployeeSalaryProfile;