import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

class SettingModel extends Model {
    static override tableName = 'settings';

    id!: number;
    name!: string;
    key!: string;
    value!: string;
    createdAt!: string;
    updatedAt!: string;
}

export default SettingModel;
