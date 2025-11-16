import { Model } from 'objection';

export class EmployeeScheduleModel extends Model {
  id!: number;
  user_id!: number;
  shift_id!: number;
  date!: string;
  status!: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  notes?: string;
  created_at!: string;
  updated_at!: string;
  shift?: any;

  static override get tableName() {
    return 'employee_schedules';
  }

  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'shift_id', 'date'],
      properties: {
        id: { type: 'integer' },
        user_id: { type: 'integer' },
        shift_id: { type: 'integer' },
        date: { type: 'string', format: 'date' },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        approved_by: { type: ['integer', 'null'] },
        approved_at: { type: ['string', 'null'], format: 'date-time' },
        notes: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  // Note: Relations commented out to avoid circular dependency issues in ES modules
  // Use manual joins in service layer if needed
  // static override get relationMappings() {
  //   return {
  //     shift: {
  //       relation: Model.BelongsToOneRelation,
  //       modelClass: () => require('./ShiftModel').ShiftModel,
  //       join: {
  //         from: 'employee_schedules.shift_id',
  //         to: 'shifts.id'
  //       }
  //     }
  //   };
  // }

  // Static methods
  static async getByUser(userId: number, filters: any = {}) {
    let query = this.query()
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select('employee_schedules.*', 'shifts.name as shift_name', 'shifts.start_time', 'shifts.end_time', 'shifts.working_unit')
      .where('employee_schedules.user_id', userId)
      .orderBy('employee_schedules.date', 'desc');

    if (filters.status) {
      query = query.where('employee_schedules.status', filters.status);
    }

    if (filters.startDate) {
      query = query.where('employee_schedules.date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('employee_schedules.date', '<=', filters.endDate);
    }

    return await query;
  }

  static async getPendingSchedules() {
    return await this.query()
      .leftJoin('shifts', 'employee_schedules.shift_id', 'shifts.id')
      .select('employee_schedules.*', 'shifts.name as shift_name', 'shifts.start_time', 'shifts.end_time', 'shifts.working_unit')
      .where('employee_schedules.status', 'pending')
      .orderBy('employee_schedules.date', 'asc');
  }

  static async checkDuplicate(userId: number, date: string) {
    const existing = await this.query()
      .where('user_id', userId)
      .where('date', date)
      .whereIn('status', ['pending', 'approved'])
      .first();

    return !!existing;
  }
}
