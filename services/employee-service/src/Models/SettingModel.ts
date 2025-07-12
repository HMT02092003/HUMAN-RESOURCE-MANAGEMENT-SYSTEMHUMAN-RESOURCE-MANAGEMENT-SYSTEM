import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class SettingModel extends Model {
    static tableName = 'settings';

    // Fields
    id!: number;
    name!: string;
    config!: { startTime: string, endTime: string };
    key!: string;
}

export default SettingModel;
