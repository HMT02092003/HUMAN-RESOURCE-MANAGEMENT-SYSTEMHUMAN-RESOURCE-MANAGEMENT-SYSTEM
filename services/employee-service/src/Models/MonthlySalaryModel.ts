import { Model } from 'objection';
import UserModel from './UserModel';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class MonthlySalaryModel extends Model {
  static tableName = 'monthly_salaries';

  // Fields
  id!: number;
  userId!: number;
  date!: string;
  advanceSalary!: number;
  latePenaltySalary!: number;
  earlyPenaltySalary!: number;
  overTimeSalary!: number;
  tax!: number;
  finalSalary!: number;

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: 'monthly_salaries.userId',
          to: 'users.id',
        },
      },
    };
  }
}

export default MonthlySalaryModel;
