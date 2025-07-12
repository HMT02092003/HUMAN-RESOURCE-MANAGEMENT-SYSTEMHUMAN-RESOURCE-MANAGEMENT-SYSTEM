import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class RolePermissionModel extends Model {
  static tableName = 'role_permissions';

  // Fields
  id!: number;
  roleId!: number;
  permissionId!: number;
  key!: string;
  value!: number;
  createdAt!: Date;
  createdBy!: number;
  scope!: number;
}

export default RolePermissionModel;
