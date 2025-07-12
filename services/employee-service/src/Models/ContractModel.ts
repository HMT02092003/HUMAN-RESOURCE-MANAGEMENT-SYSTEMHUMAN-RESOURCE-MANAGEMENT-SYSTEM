import { Model, RelationMappings } from 'objection';
import User from './UserModel';
import ContractTypeModel from './ContractTypeModel';
import connection from '../lib/Databases/Connection';

Model.knex(connection);

class Contract extends Model {
    static tableName = 'contracts';

    id!: number;
    contractTypeId!: number;
    userId!: number;
    startDate!: Date;
    endDate?: Date;
    activeDay?: Date;
    createdAt!: Date;
    updatedAt?: Date;
    status!: string;

    static get relationMappings(): RelationMappings {
        return {
            user: {
                relation: Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'contracts.userId',
                    to: 'users.id',
                },
            },
            contractType: {
                relation: Model.BelongsToOneRelation,
                modelClass: ContractTypeModel,
                join: {
                    from: 'contracts.contractTypeId',
                    to: 'contract_types.id',
                },
            },
        };
    }
}

export default Contract;
