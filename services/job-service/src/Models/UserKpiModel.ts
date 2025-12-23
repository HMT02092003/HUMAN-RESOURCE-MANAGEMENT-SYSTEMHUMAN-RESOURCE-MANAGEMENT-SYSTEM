import { Model } from 'objection';

export class UserKpiModel extends Model {
  kpi_id!: number;
  user_id!: number;
  project_id!: number;
  task_id!: string;
  month!: number;
  year!: number;
  completion_status!: 'early' | 'on_time' | 'late';
  delay_days?: number | null;
  completed_at!: string;
  due_date?: string | null;
  approved_at!: string;
  approved_by!: number;
  created_at?: string;

  static get tableName() {
    return 'user_kpi';
  }

  static get idColumn() {
    return 'kpi_id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'project_id', 'task_id', 'month', 'year', 'completion_status', 'completed_at', 'approved_at', 'approved_by'],
      properties: {
        kpi_id: { type: 'integer' },
        user_id: { type: 'integer' },
        project_id: { type: 'integer' },
        task_id: { type: 'string', maxLength: 50 },
        month: { type: 'integer', minimum: 1, maximum: 12 },
        year: { type: 'integer' },
        completion_status: { 
          type: 'string',
          enum: ['early', 'on_time', 'late']
        },
        delay_days: { type: ['integer', 'null'] },
        completed_at: { type: 'string', format: 'date-time' },
        due_date: { type: ['string', 'null'], format: 'date-time' },
        approved_at: { type: 'string', format: 'date-time' },
        approved_by: { type: 'integer' },
        created_at: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }
}

export default UserKpiModel;
