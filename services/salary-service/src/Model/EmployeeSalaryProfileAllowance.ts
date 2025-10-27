import { Model } from 'objection';
import { createRequire } from 'module';

export class EmployeeSalaryProfileAllowance extends Model {
  id!: number;
  employee_salary_profile_id!: number;
  allowance_type_id!: number;
  created_at?: string;
  updated_at?: string | null;

  // Relations
  allowanceType?: any;
  employeeSalaryProfile?: any;

  static tableName = 'employee_salary_profile_allowances';

  static jsonSchema = {
    type: 'object',
    required: ['employee_salary_profile_id', 'allowance_type_id'],
    properties: {
      id: { type: 'integer' },
      employee_salary_profile_id: { type: 'integer' },
      allowance_type_id: { type: 'integer' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: ['string', 'null'], format: 'date-time' },
    },
  };

  static get relationMappings() {
    const requireFrom = createRequire(import.meta.url);
    const EmployeeSalaryProfile = requireFrom('./EmployeeSalaryProfile').default;
    const AllowanceType = requireFrom('./AllowanceType').default;
    
    return {
      employeeSalaryProfile: {
        relation: Model.BelongsToOneRelation,
        modelClass: EmployeeSalaryProfile,
        join: {
          from: 'employee_salary_profile_allowances.employee_salary_profile_id',
          to: 'employee_salary_profiles.id',
        },
      },
      allowanceType: {
        relation: Model.BelongsToOneRelation,
        modelClass: AllowanceType,
        join: {
          from: 'employee_salary_profile_allowances.allowance_type_id',
          to: 'allowance_types.id',
        },
      },
    };
  }

  // Add modifiers for common queries
  static get modifiers() {
    return {
      forProfile(builder: any, profileId: number) {
        builder.where('employee_salary_profile_id', profileId);
      },
      withType(builder: any) {
        builder.withGraphFetched('allowanceType');
      },
    };
  }
}

export default EmployeeSalaryProfileAllowance;