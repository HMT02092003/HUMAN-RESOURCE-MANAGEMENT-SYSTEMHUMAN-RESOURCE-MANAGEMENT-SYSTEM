import { Model, RelationMappings } from 'objection';
import RoleModel from '@/src/Models/RoleModel';
import ChevronModel from './ChevronModel';
import DepartmentModel from './DepartmentModel';
import ContractTypeModel from './ContractTypeModel';
import ContractModel from './ContractModel';
import connection from '../lib/Databases/Connection';
import constantConfig from '@/src/config/constant';  
import { getDecodedToken } from '@/src/utils/decode-token';
Model.knex(connection);

const { permissionScope } = constantConfig

class UserModel extends Model {
  static tableName = 'users';

  id!: number;
  username!: string;
  password!: string;
  roleId!: number;
  firstName!: string;
  lastName!: string;
  email!: string;
  startDate!: string;
  dayOff!: string;
  profileFamily!: string;
  chevronId!: number;
  departmentId!: number;
  status!: string;
  vacationDay!: number;
  baseSalary!: number;
  createdBy!: number;
  updatedBy!: number;
  birthday!: string;

  // Optional relation fields
  contract?: ContractModel[];
  currentContract?: ContractModel;
  upcomingContracts?: ContractModel[];
  pastContracts?: ContractModel[];

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['username', 'password', 'roleId', 'firstName', 'lastName', 'email'],
      properties: {
        id: { type: 'integer' },
        username: { type: 'string' },
        password: { type: 'string' },
        roleId: { type: 'integer' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        startDate: { type: 'string', format: 'date' },
        dayOff: { type: 'string' },
        profileFamily: { type: 'string' },
        chevronId: { type: 'integer' },
        departmentId: { type: 'integer' },
        status: { type: 'string' },
        vacationDay: { type: 'number' },
        baseSalary: { type: 'number' },
        createdBy: { type: 'integer' },
        updatedBy: { type: 'integer' },
        birthday: { type: 'string', format: 'date' },
      },
    };
  }

  static get relationMappings(): RelationMappings {
    return {
      role: {
        relation: Model.BelongsToOneRelation,
        modelClass: RoleModel,
        join: {
          from: 'users.roleId',
          to: 'roles.id',
        },
      },
      chevron: {
        relation: Model.BelongsToOneRelation,
        modelClass: ChevronModel,
        join: {
          from: 'users.chevronId',
          to: 'chevrons.id',
        },
      },
      department: {
        relation: Model.BelongsToOneRelation,
        modelClass: DepartmentModel,
        join: {
          from: 'users.departmentId',
          to: 'departments.id',
        },
      },
      contract: {
        relation: Model.HasManyRelation,
        modelClass: ContractModel,
        join: {
          from: 'users.id',
          to: 'contracts.userId',
        },
      },
      contractType: {
        relation: Model.ManyToManyRelation,
        modelClass: ContractTypeModel,
        join: {
          from: 'users.id',
          through: {
            from: 'contracts.userId',
            to: 'contracts.contractTypeId',
          },
          to: 'contractTypes.id',
        },
      },
      creator: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: 'users.createdBy',
          to: 'users.id',
        },
      },
      updater: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel,
        join: {
          from: 'users.updatedBy',
          to: 'users.id',
        },
      },
    };
  }

  static async checkScope(permissionKey: string, req: any) { // Thêm `req: any` vào tham số

    const tokenFromCookie = req.cookies.token;
    let decodedAuth: any = null; // Biến để lưu trữ thông tin user đã giải mã

    if (tokenFromCookie) {
      try {
        decodedAuth = getDecodedToken(tokenFromCookie);
      } catch (decodeError) {
        console.error("Error decoding token in checkScope:", decodeError);
        // Nếu token không hợp lệ, không thể xác định scope, trả về mảng rỗng hoặc ném lỗi
        return [];
      }
    } else {
      console.log("No token cookie found in checkScope.");
      return []; // Không có token, không thể xác định scope
    }

    // Đảm bảo decodedAuth và user.scope tồn tại
    if (!decodedAuth || !decodedAuth.user || !decodedAuth.user.scope) {
        console.error("Decoded token or scope information is missing.");
        return [];
    }

    // Lấy giá trị scope tương ứng với permissionKey từ token
    const actualScopeValue = decodedAuth.user.scope[permissionKey];
    console.log(`Actual scope value for '${permissionKey}':`, actualScopeValue);


    let ids: number[] = [];

    if (actualScopeValue === permissionScope.personal) {
      ids = [decodedAuth.user.id]; // Sử dụng id của user từ token
    }
    else if (actualScopeValue === permissionScope.department) {
      const usersInDepartment = await this.query()
        .select('id')
        .where('departmentId', decodedAuth.user.departmentId); // Sử dụng departmentId từ token

      ids = usersInDepartment.map(user => user.id);
    }
    else if (actualScopeValue === permissionScope.global) {
      const users = await this.query().select('id');

      ids = users.map(user => user.id);
    } else {
        console.warn(`Unknown scope value for '${permissionKey}': ${actualScopeValue}. Returning empty array.`);
        // Xử lý trường hợp không tìm thấy scope hoặc giá trị không hợp lệ
        return [];
    }

    // console.log('ids:', ids);

    return ids;
  }
}

export default UserModel;
