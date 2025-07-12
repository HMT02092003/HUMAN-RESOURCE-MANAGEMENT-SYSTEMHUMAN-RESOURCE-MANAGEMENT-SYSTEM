import { Model } from 'objection';
import UserModel from './UserModel';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class TimeAttendanceModel extends Model {
  static tableName = 'time_attendances';

  id!: number;
  userId!: number;
  date!: Date;
  checkInTime!: Date | null;
  checkOutTime!: Date | null;
  created_at!: Date;
  updated_at!: Date;

  dailyTotalWorkHours!: number;
  lateMinutes!: number;
  earlyDepartureMinutes!: number;
  dailyWorkingSalary!: number;
  earlyLeavePenalty!: number;
  lateArrivalPenalty!: number;
  otWorkingSalary!: number;
  otMinutes!: number;
  otSalary!: number;

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: 'time_attendances.userId',
          to: 'users.id',
        },
      },
    };
  }
}

export default TimeAttendanceModel;
