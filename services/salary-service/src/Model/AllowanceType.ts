import { Model } from 'objection';
import { createRequire } from 'module';

export class AllowanceType extends Model {
  id!: number;
  name!: string;
  description?: string | null;
  is_taxable?: boolean;
  default_amount?: string;
  created_at?: string;
  updated_at?: string | null;

  static tableName = 'allowance_types';

  static jsonSchema = {
    type: 'object',
    required: <string[]>['name'],
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      description: { type: ['string', 'null'] },
      is_taxable: { type: 'boolean' },
  // allow number or string for decimal fields (frontend may send numeric)
  default_amount: { type: ['number', 'string'] },
      created_at: { type: 'string' },
      updated_at: { type: ['string', 'null'] },
    },
  };
  static get relationMappings(): any {
  const requireFrom = createRequire(import.meta.url);
  const PayslipAllowance = requireFrom('../Model/PayslipAllowance').default;
    return {
      payslipAllowances: {
        relation: Model.HasManyRelation,
        modelClass: PayslipAllowance,
        join: {
          from: 'allowance_types.id',
          to: 'payslip_allowances.allowance_type_id',
        },
      },
    };
  }
}

export default AllowanceType;
