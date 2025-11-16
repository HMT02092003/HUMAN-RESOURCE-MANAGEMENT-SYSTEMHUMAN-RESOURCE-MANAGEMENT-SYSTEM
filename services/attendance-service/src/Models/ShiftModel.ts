import { Model } from 'objection';

export class ShiftModel extends Model {
  static override get tableName() {
    return 'shifts';
  }

  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'start_time', 'end_time'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', maxLength: 150 },
        start_time: { type: 'string' },
        end_time: { type: 'string' },
        working_unit: { type: 'number' },
        description: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  // Note: Relations commented out to avoid circular dependency issues in ES modules
  // Use manual joins in service layer if needed
  // static override get relationMappings() {
  //   return {
  //     schedules: {
  //       relation: Model.HasManyRelation,
  //       modelClass: () => require('./EmployeeScheduleModel').EmployeeScheduleModel,
  //       join: {
  //         from: 'shifts.id',
  //         to: 'employee_schedules.shift_id'
  //       }
  //     }
  //   };
  // }
}
