import { Model } from 'objection';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class ContractType extends Model {
    static tableName = 'contract_types';

    id!: number;
    name!: string;
    type!: number;
    insurance!: number;
    description?: string;
    contractTerm?: number;
    createdAt!: Date;
    updatedAt?: Date;

    static relationMappings = {
        // Add relations here if needed
    };
}

export default ContractType;
