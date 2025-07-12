import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class HolidayModel extends Model {
    static tableName = 'holidays';

    id!: number;
    name!: string;
    type!: number;
    insurance!: number | null;
    description!: string | null;
    contractTerm!: number;
    createdAt!: Date;
    updatedAt!: Date;
}

export default HolidayModel;
