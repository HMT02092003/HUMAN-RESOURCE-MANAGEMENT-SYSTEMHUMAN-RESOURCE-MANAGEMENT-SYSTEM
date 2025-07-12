import { Model } from 'objection';
import RolePermissionModel from './RolePermissionModel';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class PermissionModel extends Model {
  static tableName = 'permissions';

  // Fields
  id!: number;
  name!: string;
  description!: any;

  static get relationMappings() {
    return {
      rolePermission: {
        relation: Model.BelongsToOneRelation,
        modelClass: RolePermissionModel,
        join: {
          from: 'permissions.id',
          to: 'role_permissions.permissionId',
        },
      },
    };
  }
}

export default PermissionModel;
