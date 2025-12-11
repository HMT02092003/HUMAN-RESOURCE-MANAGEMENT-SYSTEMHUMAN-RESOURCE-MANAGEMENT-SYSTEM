import { Model, ModelObject } from 'objection';

export class ProjectExpenseModel extends Model {
  expense_id!: string;
  project_id!: number;
  title!: string;
  description?: string | null;
  amount!: number;
  category!: 'personnel' | 'equipment' | 'software' | 'travel' | 'marketing' | 'infrastructure' | 'training' | 'consulting' | 'maintenance' | 'other';
  expense_date!: string;
  created_by?: number | null;
  status!: 'pending' | 'approved' | 'rejected';
  approved_by?: number | null;
  approved_at?: string | null;
  metadata?: any;
  created_at?: string;
  updated_at?: string;

  static get tableName() {
    return 'project_expenses';
  }

  static get idColumn() {
    return 'expense_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['project_id', 'title', 'amount', 'category', 'expense_date'],
      properties: {
        expense_id: { type: 'string' },
        project_id: { type: 'integer' },
        title: { type: 'string', maxLength: 255 },
        description: { type: ['string', 'null'] },
        amount: { type: 'number', minimum: 0 },
        category: {
          type: 'string',
          enum: ['personnel', 'equipment', 'software', 'travel', 'marketing', 'infrastructure', 'training', 'consulting', 'maintenance', 'other']
        },
        expense_date: { type: 'string', format: 'date' },
        created_by: { type: ['integer', 'null'] },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending'
        },
        approved_by: { type: ['integer', 'null'] },
        approved_at: { type: ['string', 'null'], format: 'date-time' },
        metadata: { type: ['object', 'null'] },
        created_at: { type: ['string', 'null'], format: 'date-time' },
        updated_at: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }

  // Hook before update to set updated_at
  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

export type ProjectExpense = ModelObject<ProjectExpenseModel>;
export default ProjectExpenseModel;
