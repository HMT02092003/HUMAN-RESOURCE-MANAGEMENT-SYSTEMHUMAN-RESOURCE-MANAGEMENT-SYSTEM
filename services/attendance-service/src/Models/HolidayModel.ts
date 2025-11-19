import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

class HolidayModel extends Model {
  static override tableName = 'holidays';

  id!: number;
  name!: string;
  description?: string;
  importance?: number;
  start_date!: string; // YYYY-MM-DD
  end_date!: string; // YYYY-MM-DD
  created_at!: string;
  updated_at!: string;
}

export default HolidayModel;
