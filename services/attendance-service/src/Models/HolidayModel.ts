import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

class HolidayModel extends Model {
  static override tableName = 'holidays';

  id!: number;
  date!: string; // YYYY-MM-DD
  name!: string;
  isPublic!: boolean;
}

export default HolidayModel;
