import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

export default class RoleModel extends Model {
  static tableName = 'roles';

  id!: number;
  name!: string;
  description?: string;
  parentId?: number;
  key!: string;
  createdAt!: Date;
  updatedAt?: Date;
  createBy!: number;
  updateBy?: number;
}
