import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class DepartmentModel extends Model {
  static tableName = 'departments';

  // Fields
  id!: number;
  name!: string;
  description!: string;
  role_ids!: number[];
}

export default DepartmentModel;
