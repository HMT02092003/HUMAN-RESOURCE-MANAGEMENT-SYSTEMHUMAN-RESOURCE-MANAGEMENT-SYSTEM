import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class ChevronModel extends Model {
  static tableName = 'chevrons';

  // Fields
  id!: number;
  name!: string;
  description!: string;
}

export default ChevronModel;
