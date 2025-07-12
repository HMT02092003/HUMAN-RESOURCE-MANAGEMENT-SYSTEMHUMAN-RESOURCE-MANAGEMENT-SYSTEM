import { Model, RelationMappings } from 'objection';
import UserModel from './UserModel';
import ChevronModel from './ChevronModel';
import DepartmentModel from './DepartmentModel';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class ApplicationModel extends Model {
  static tableName = 'applications';

  // Fields
  id!: number;
  userId!: number;
  userApprovedId?: number;
  type!: number;
  data!: JSON;
  reason!: string;
  note!: string;
  status!: number;
  createdAt!: Date;
  updatedAt?: Date;
  chevronId?: number;
  departmentId?: number;

  static get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: 'applications.userId',
          to: 'users.id',
        },
      },
      approvedBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: 'applications.userApprovedId',
          to: 'users.id',
        },
      },
      department: {
        relation: Model.HasOneThroughRelation,
        modelClass: DepartmentModel,
        join: {
          from: 'applications.userId',
          through: {
            from: 'users.id',
            to: 'users.departmentId',
          },
          to: 'departments.id',
        },
      },
      chevron: {
        relation: Model.HasOneThroughRelation,
        modelClass: ChevronModel,
        join: {
          from: 'applications.userId',
          through: {
            from: 'users.id',
            to: 'users.chevronId',
          },
          to: 'chevrons.id',
        },
      },
    };
  }
}

export default ApplicationModel;
