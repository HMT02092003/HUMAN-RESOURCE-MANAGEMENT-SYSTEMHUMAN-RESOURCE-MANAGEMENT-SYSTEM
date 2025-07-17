import { Request, Response } from "express";
import UserModel from "@/src/Models/UserModel";
import RoleModel from "@/src/Models/RoleModel";
import ChevronModel from "@/src/Models/ChevronModel";
import ContractTypeModel from "@/src/Models/ContractTypeModel";
import DepartmentModel from "@/src/Models/DepartmentModel";
import ContractModel from "@/src/Models/ContractModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";
// import MailService from "@/src/Services/Mail";
// import baseUpload from "@/src/utils/uploadExcel";
import constantConfig from "@/src/config/constant";
import bcrypt from 'bcryptjs';
import moment from "moment";
import _ from "lodash";
import { getDecodedToken } from '@/src/utils/decode-token';
const { Gender, statusOptions, Relationship } = constantConfig;

// const {
//   validateUpload,
//   validateDataExistInDBByColumn,
//   isEmail,
//   mapErrorsToGridTable,
//   mapError,
//   validateNotAllowDataExistInDBByColumn,
// } = baseUpload;


/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (req: any, res: Response) => {
  try {
    const { auth } = req as any;
    const scope = "users";
    let inputs = { ...req.query, ...req.body };

    let project = ["users.*"];
    let currentDate = new Date();

    let userIds: number[] = await UserModel.checkScope(scope, req);

    console.log("userIds", userIds);

    // Retrieve page and pageSize from query parameters, defaulting to 0 and 10
    // Ensure these are treated as numbers
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    let result: any = (await UserModel.query()
      .withGraphJoined("[role, department, chevron, contract.[contractType]]")
      .select(project)
      .whereIn("users.id", userIds)
      .whereNot("users.id", auth.id)
      .page(page, pageSize)) as any; // Use parsed page and pageSize

    result.results.forEach((user: any) => {
      if (!user.contract || !user.contract.length) return;

      let currentContract: any | null = null;
      const contracts = user.contract;

      contracts.sort(
        (a: any, b: any) =>
          new Date(a.activeDay).getTime() - new Date(b.activeDay).getTime()
      );

      contracts.forEach((contract: any) => {
        const activeDay = new Date(contract.activeDay).getTime();
        const endDate = contract.endDate
          ? new Date(contract.endDate).getTime()
          : Infinity;
        const startDate = new Date(contract.startDate).getTime();

        if (activeDay > currentDate.getTime()) {
          contract.status = "upcoming";
          return;
        }

        if (endDate < currentDate.getTime()) {
          contract.status = "past";
          return;
        }

        if (!currentContract) {
          currentContract = contract;
          currentContract.status = "current";
          return;
        }

        const currentActiveDay = new Date(currentContract.activeDay).getTime();
        const currentStartDate = new Date(currentContract.startDate).getTime();

        if (
          activeDay > currentActiveDay ||
          (activeDay === currentActiveDay && startDate > currentStartDate)
        ) {
          currentContract.status = "past";
          currentContract = contract;
          currentContract.status = "current";
          return;
        }
        contract.status = "past";
      });

      const statusOrder: { [key: string]: number } = { current: 1, upcoming: 2, past: 3 };
      user.contract.sort(
        (a: any, b: any) => (statusOrder[a.status!] || 99) - (statusOrder[b.status!] || 99)
      );
    });

    console.log("Total records:", result.total);
    return res.status(200).json(result); // This correctly returns { results: [...], total: N }
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { auth } = req as any; // Consider extending Request interface for better type safety for 'auth'
    const inputs = req.body;
    console.log("Inputs:", inputs);

    const allowFields = {
      firstName: "string!",
      lastName: "string!",
      username: "string!",
      password: "string!",
      roleId: "number!",
      email: "string!",
      departmentId: "number!",
      chevronId: "number!",
      status: "number",
      gender: "number",
      phone: "string",
      birthday: "date",
      startDate: "date",
      profileFamily: [
        {
          name: "string",
          relationship: "number",
          birthday: "date",
          dependent: "boolean",
        },
      ],
      contract: {
        contractTypeId: "number",
        startDate: "date",
        endDate: "date",
        activeDay: "date",
        insurance: "number",
      },
    };

    const params = validate(inputs, allowFields, {
      removeNotAllow: true,
    });

    console.log("Create user params:", params);

    // Stringify profileFamily if it's meant to be stored as a JSON string in the database
    if (params.profileFamily) {
      params.profileFamily = JSON.stringify(params.profileFamily);
    }

    // Destructure contract out of params, the rest goes into userData
    let { contract, ...userData } = params;

    // Check for existing user by username or email
    const existingUser = await UserModel.query()
      .where("username", params.username)
      .orWhere("email", params.email)
      .first();

    if (existingUser) {
      if (existingUser.username === params.username) {
        return res.status(400).json({ error: "Username already exists!", code: 5005 });
      }
      if (existingUser.email === params.email) {
        return res.status(400).json({ error: "Email already exists!", code: 6021 });
      }
    }

    // Fetch related entities concurrently using the custom `getById` or `findById` methods
    const [role, chevron, department] = await Promise.all([
      RoleModel.query().findById(params.roleId),
      ChevronModel.query().findById(params.chevronId), 
      DepartmentModel.query().findById(params.departmentId),
    ]);

    // Validate if related entities exist
    if (!role) return res.status(400).json({ error: "User role not exists!", code: 5006 });
    if (!chevron) return res.status(400).json({ error: "Chevron not exists!", code: 5007 });
    if (!department) return res.status(400).json({ error: "Department not exists!", code: 5008 });
    // Hash the user's password using bcrypt
    params.password = await bcrypt.hash(params.password, 10);

    // Add createdBy from auth ID
    userData = {
      ...userData,
      createdBy: auth.id,
    };

    console.log("User data:", userData);

    // Insert the new user into the database using the custom insertOne method
    const newUser = await UserModel.query().insert(userData);
    // Remove password from the response object for security
    const { password: _, ...userWithoutPassword } = newUser;
    const newUserResponse = userWithoutPassword;

    // Prepare email variables (commented out as per original code) 
    const emailVariables = {
      fullname: `${params.lastName || ""} ${params.firstName || ""}`.trim(),
      username: params.username,
      password: params.password, // Be cautious sending plain passwords, consider a password reset flow
    };

    // await MailService.send({
    //   to: params.email,
    //   templateKey: "createUser",
    //   variables: emailVariables,
    // });

    // Handle contract creation if contract data is provided
    if (params.contract) {
      // Validate contract dates
      if (
        params.contract.endDate &&
        new Date(params.contract.endDate) <= new Date(params.contract.startDate)
      ) {
        return res.status(400).json({ error: "End date must be after start date!", code: 5009 });
      }

      if (
        new Date(params.contract.activeDay) < new Date(params.contract.startDate)
      ) {
        return res.status(400).json({
          error: "Active day must be after or equal to start date!",
          code: 5010
        });
      }

      // Check if contract type exists
      const contractType = await ContractTypeModel.query().findById(
        params.contract.contractTypeId
      );
      if (!contractType) {
        return res.status(400).json({ error: "Contract Type not exists!", code: 5011 });
      }

      // Prepare contract parameters and insert
      const contractParams = {
        userId: newUser.id,
        ...params.contract,
        created_at: new Date(),
      };

      await ContractModel.query().insert(contractParams); // Assuming ContractModel has insertOne
    }

    // Return the newly created user (without password)
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle custom ValidationException
    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    // Handle other errors
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

/**
 * Get users by departmentId or departmentIds (for internal service use)
 */
export const getUsersByDepartment = async (req: Request, res: Response) => {
  try {
    let { departmentId, departmentIds } = req.query;
    let query = UserModel.query().select('id', 'username', 'email', 'departmentId');

    if (departmentId) {
      // Ép kiểu về number (nếu là string)
      const depId = Array.isArray(departmentId) ? Number(departmentId[0]) : Number(departmentId);
      query = query.where('departmentId', depId);
    } else if (departmentIds) {
      // departmentIds có thể là chuỗi "1,2,3" hoặc mảng
      let ids: number[] = [];
      if (Array.isArray(departmentIds)) {
        ids = departmentIds.map(id => Number(id));
      } else {
        ids = String(departmentIds).split(',').map(Number);
      }
      query = query.whereIn('departmentId', ids);
    } else {
      return res.status(400).json({ error: 'Missing departmentId or departmentIds' });
    }

    const users = await query;
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by department:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Get users by chevronId or chevronIds (for internal service use)
 */
export const getUsersByChevron = async (req: Request, res: Response) => {
  try {
    let { chevronId, chevronIds } = req.query;
    let query = UserModel.query().select('id', 'username', 'email', 'chevronId');

    if (chevronId) {
      // Ép kiểu về number (nếu là string)
      const chvId = Array.isArray(chevronId) ? Number(chevronId[0]) : Number(chevronId);
      query = query.where('chevronId', chvId);
    } else if (chevronIds) {
      // chevronIds có thể là chuỗi "1,2,3" hoặc mảng
      let ids: number[] = [];
      if (Array.isArray(chevronIds)) {
        ids = chevronIds.map(id => Number(id));
      } else {
        ids = String(chevronIds).split(',').map(Number);
      }
      query = query.whereIn('chevronId', ids);
    } else {
      return res.status(400).json({ error: 'Missing chevronId or chevronIds' });
    }

    const users = await query;
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by chevron:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// /**
//  * Get user details by ID
//  */
// export const getUserDetail = async (req: Request, res: Response) => {
//   try {
//     const allowFields = {
//       id: "number!",
//     };
//     const currentDate = new Date();
//     let inputs = { ...req.query, ...req.body };
//     let params = validate(inputs, allowFields, { removeNotAllow: true });

//     const project = [
//       "users.id as id",
//       "users.username",
//       "users.firstName",
//       "users.lastName",
//       "users.email",
//       "users.roleId",
//       "users.createdAt",
//       "users.status",
//       "users.profileFamily",
//       "contract.id as contract_id",
//       "contract.startDate",
//       "contract.endDate",
//       "contract.activeDay",
//       "users.departmentId",
//       "users.chevronId",
//       "users.phone",
//       "users.birthday",
//       "users.gender",
//       "users.startDate",
//     ];

//     let result = await UserModel.query()
//       .findById(params.id)
//       .withGraphJoined("[role, department, chevron, contract.[contractType]]")
//       .select(project)
//       .modifyGraph("contract", (builder) => {
//         builder.orderBy("activeDay", "asc");
//       });

//     if (!result) {
//       return res.status(404).json({ error: "User doesn't exist!", code: 5003 });
//     }

//     if (!result.contract || !result.contract.length) {
//       return res.status(200).json(result);
//     }

//     let currentContract = null;
//     const contracts = result.contract;

//     for (let contract of contracts) {
//       const activeDay = new Date(contract.activeDay).getTime();
//       const endDate = contract.endDate
//         ? new Date(contract.endDate).getTime()
//         : Infinity;
//       const startDate = new Date(contract.startDate).getTime();

//       if (activeDay > currentDate.getTime()) {
//         contract.status = "upcoming";
//         continue;
//       }

//       if (endDate < currentDate.getTime()) {
//         contract.status = "past";
//         continue;
//       }

//       if (!currentContract) {
//         currentContract = contract;
//         currentContract.status = "current";
//         continue;
//       }

//       const currentActiveDay = new Date(currentContract.activeDay).getTime();
//       const currentStartDate = new Date(currentContract.startDate).getTime();

//       if (
//         activeDay > currentActiveDay ||
//         (activeDay === currentActiveDay && startDate > currentStartDate)
//       ) {
//         currentContract.status = "past";
//         currentContract = contract;
//         currentContract.status = "current";
//         continue;
//       }
//       contract.status = "past";
//     }

//     const statusOrder = {
//       current: 1,
//       upcoming: 2,
//       past: 3,
//     };

//     result.contract.sort(
//       (a, b) => statusOrder[a.status] - statusOrder[b.status]
//     );

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Error fetching user detail:", error);

//     if (error instanceof ValidationException) {
//       return res.status(error.status).json({
//         error: error.message,
//         code: error.code
//       });
//     }

//     return res.status(500).json({
//       error: error instanceof Error ? error.message : "Internal Server Error",
//       code: 500
//     });
//   }
// };

// /**
//  * Update an existing user
//  */
// export const updateUser = async (req: Request, res: Response) => {
//   try {
//     const { auth } = req as any;
//     const inputs = req.body;

//     const allowFields = {
//       id: "number!",
//       firstName: "string!",
//       lastName: "string!",
//       username: "string!",
//       email: "string!",
//       roleId: "number",
//       departmentId: "number!",
//       chevronId: "number!",
//       status: "number",
//       gender: "number",
//       phone: "string",
//       birthday: "date",
//       startDate: "date",
//       profileFamily: [
//         {
//           name: "string",
//           relationship: "number",
//           birthday: "date",
//           dependent: "boolean",
//         },
//       ],
//     };

//     const params = validate(inputs, allowFields, {
//       removeNotAllow: true,
//     });
//     console.log("Update user params:", params);

//     params.profileFamily = JSON.stringify(params.profileFamily);
//     const { id, ...updateData } = params;

//     const existingUser = await UserModel.getById(id);
//     if (!existingUser) {
//       return res.status(404).json({ error: "User doesn't exist!", code: 6006 });
//     }

//     // Check for unique constraints only if values have changed
//     const usernameChanged =
//       params.username && params.username !== existingUser.username;
//     const emailChanged =
//       updateData.email && updateData.email !== existingUser.email;

//     if (usernameChanged || emailChanged) {
//       const query = UserModel.query().whereNot("id", id);

//       if (usernameChanged) {
//         query.where(function () {
//           this.orWhere("username", params.username);
//         });
//       }

//       if (emailChanged) {
//         query.where(function () {
//           this.orWhere("email", updateData.email);
//         });
//       }

//       const duplicateUser = await query.first();

//       if (duplicateUser) {
//         if (usernameChanged && duplicateUser.username === params.username) {
//           return res.status(400).json({ error: "Username already exists!", code: 6007 });
//         }
//         if (emailChanged && duplicateUser.email === updateData.email) {
//           return res.status(400).json({ error: "Email already exists!", code: 6021 });
//         }
//       }
//     }

//     // Validate related entities
//     const [role, chevron, department] = await Promise.all([
//       updateData.roleId
//         ? RoleModel.getById(updateData.roleId)
//         : Promise.resolve(true),
//       updateData.chevronId
//         ? ChevronModel.getById(updateData.chevronId)
//         : Promise.resolve(true),
//       updateData.departmentId
//         ? DepartmentModel.getById(updateData.departmentId)
//         : Promise.resolve(true),
//     ]);

//     if (!role) return res.status(400).json({ error: "User role not exists!", code: 5006 });
//     if (!chevron) return res.status(400).json({ error: "Chevron not exists!", code: 5007 });
//     if (!department) return res.status(400).json({ error: "Department not exists!", code: 5008 });

//     const paramsData = {
//       ...updateData,
//       updatedBy: auth.id,
//       updatedAt: new Date(),
//     };

//     console.log("Update user data:", paramsData);

//     const result = await UserModel.updateOne(id, paramsData);
//     delete result.password;

//     if (emailChanged) {
//       await MailService.send({
//         to: updateData.email,
//         templateKey: "updateUserEmail",
//         variables: {
//           fullname: `${updateData.lastName} ${updateData.firstName}`.trim(),
//           params: params.username,
//         },
//       });
//     }

//     return res.status(200).json({
//       updated: result,
//       old: existingUser,
//     });
//   } catch (error) {
//     console.error("Error updating user:", error);

//     if (error instanceof ValidationException) {
//       return res.status(error.status).json({
//         error: error.message,
//         code: error.code
//       });
//     }

//     return res.status(500).json({
//       error: error instanceof Error ? error.message : "Internal Server Error",
//       code: 500
//     });
//   }
// };

// /**
//  * Import users from Excel
//  */
// export const importExcel = async (req: Request, res: Response) => {
//   try {
//     let inputs = req.body;
//     const { auth } = req as any;
//     let { warring, errors, data } = await _beforeUpload({
//       inputs: inputs.users,
//       auth,
//     });
//     warring = (warring || []).sort((a, b) => a.row - b.row);

//     console.log("Data:", data);

//     if (errors) {
//       let errorsForGridTable = mapErrorsToGridTable(errors);
//       return res.status(400).json({
//         error: "Nhập excel xảy ra lỗi!",
//         code: 4000,
//         details: { error: errorsForGridTable }
//       });
//     }

//     data.forEach(async (item) => {
//       const hashPassword = await UserModel.hash(item.password);

//       const statusMap = {
//         "Đang làm việc": "Đang hoạt động",
//         "Đã nghỉ việc": "Đã nghỉ việc",
//         "Nghỉ thai sản": "Nghỉ thai sản",
//       };

//       const mappedStatus = statusMap[item.status] || item.status;
//       const findStatusValue = statusOptions.find(
//         (opt) => opt.label === mappedStatus
//       );

//       console.log(findStatusValue);

//       const userValue = {
//         firstName: item.firstName,
//         lastName: item.lastName,
//         username: item.username,
//         password: hashPassword,
//         roleId: item.roleId,
//         email: item.email,
//         departmentId: item.departmentId,
//         chevronId: item.chevronId,
//         status: findStatusValue.value,
//         gender: item.gender,
//         phone: item.phone,
//         birthday: moment(item.birthday, "DD/MM/YYYY").add(1, "days").utc(),
//         startDate: moment(item.startDateUser, "DD/MM/YYYY")
//           .add(1, "days")
//           .utc(),
//       };

//       console.log(userValue);

//       const userData: any = await UserModel.insertMany(userValue);

//       console.log("User data:", userData.id);

//       const startDate = moment(item.startDate, "DD/MM/YYYY")
//         .startOf("day")
//         .utc();
//       const activeDay = moment(item.activeDay, "DD/MM/YYYY")
//         .startOf("day")
//         .utc();

//       const findContractTerm = await ContractTypeModel.query().findById(
//         item.contractTypeId
//       );

//       const daysDiff = activeDay.diff(startDate, "days");

//       let endDate: string | null = null;

//       if (findContractTerm.contractTerm > 0) {
//         const endDateCalculation = moment(startDate).add(
//           findContractTerm.contractTerm,
//           "months"
//         );
//         endDate = endDateCalculation.add(daysDiff, "days").toISOString();
//       }

//       const contract = {
//         id: userData.id,
//         contractTypeId: item.contractTypeId,
//         startDate: startDate.toISOString(),
//         endDate: endDate,
//         activeDay: activeDay.toISOString(),
//         insurance: item.insurance,
//       };

//       console.log("Contract:", contract);

//       // Contract creation logic
//       const allowFields = {
//         id: "number!",
//         contractTypeId: "number!",
//         startDate: "date!",
//         endDate: "date",
//         activeDay: "date!",
//         insurance: "number",
//       };

//       let params = validate(contract, allowFields, {
//         removeNotAllow: true,
//       });

//       const userId = params.id;

//       // Check if user exists
//       const user = await UserModel.getById(params.id);
//       if (!user) throw new Error("User doesn't exist!");

//       // Validate contract type
//       const contractType = await ContractTypeModel.query().findById(
//         params.contractTypeId
//       );
//       if (!contractType) throw new Error("Contract Type not exists!");

//       // Validate dates
//       if (
//         params.endDate &&
//         new Date(params.endDate) <= new Date(params.startDate)
//       ) {
//         throw new Error("End date must be after start date!");
//       }

//       if (new Date(params.activeDay) < new Date(params.startDate)) {
//         throw new Error("Active day must be after or equal to start date!");
//       }

//       // Remove id to let DB auto-generate
//       delete params.id;

//       // Create contract
//       const contractData = {
//         ...params,
//         userId: userId,
//         created_at: new Date(),
//       };

//       console.log("Contract data:", contractData);

//       await ContractModel.insertOne(contractData);
//     });

//     return res.status(200).json({ warring });
//   } catch (error) {
//     console.error("Error importing Excel:", error);
//     return res.status(500).json({
//       error: error instanceof Error ? error.message : "Internal Server Error",
//       code: 500
//     });
//   }
// };

// /**
//  * Delete a single user
//  */
// export const deleteUser = async (req: Request, res: Response) => {
//   try {
//     const { auth } = req as any;
//     let params = { ...req.query, ...req.body };

//     let id = params.id;
//     if (!id) {
//       return res.status(400).json({ error: "ID is required!", code: 9996 });
//     }

//     let exist = await UserModel.getById(id);
//     if (!exist) {
//       return res.status(404).json({ error: "User doesn't exists!", code: 6006 });
//     }
    
//     if ([id].includes(auth.id)) {
//       return res.status(400).json({ 
//         error: "You can not remove your account.", 
//         code: 6022 
//       });
//     }

//     await ContractModel.query().delete().where("userId", id);

//     let user = await UserModel.query().where("id", params.id).first();
//     await user.$query().delete();

//     return res.status(200).json({
//       message: "Delete successfully",
//       old: user,
//     });
//   } catch (error) {
//     console.error("Error deleting user:", error);
//     return res.status(500).json({
//       error: error instanceof Error ? error.message : "Internal Server Error",
//       code: 500
//     });
//   }
// };

// /**
//  * Delete multiple users
//  */
// export const deleteMultipleUsers = async (req: Request, res: Response) => {
//   try {
//     const { auth } = req as any;
//     const allowFields = {
//       ids: ["number!"],
//     };
//     const inputs = req.body;
//     let params = validate(inputs, allowFields);

//     let exist = await UserModel.query().whereIn("id", params.ids);
//     if (!exist || exist.length !== params.ids.length) {
//       return res.status(404).json({ error: "User doesn't exists!", code: 6006 });
//     }
    
//     if (params.ids.includes(auth.id)) {
//       return res.status(400).json({ 
//         error: "You can not remove your account.", 
//         code: 6022 
//       });
//     }

//     let contract = await ContractModel.query()
//       .delete()
//       .whereIn("userId", params.ids);

//     let users = await UserModel.query().whereIn("id", params.ids);
//     for (let user of users) {
//       await user.$query().delete();
//     }

//     return res.status(200).json({
//       old: {
//         usernames: (users || []).map((user) => user.username).join(", "),
//       },
//     });
//   } catch (error) {
//     console.error("Error deleting multiple users:", error);

//     if (error instanceof ValidationException) {
//       return res.status(error.status).json({
//         error: error.message,
//         code: error.code
//       });
//     }

//     return res.status(500).json({
//       error: error instanceof Error ? error.message : "Internal Server Error",
//       code: 500
//     });
//   }
// };

// /**
//  * Get current user info
//  */
// export const getUserInfo = async (req: Request, res: Response) => {
//   try {
//     const { auth } = req as any;
//     let result = await UserModel.getById(auth.id);
//     delete result["password"];

//     if (!result) {
//       return res.status(404).json({ error: "User doesn't exist", code: 6006 });
//     }

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Error getting user info:", error);
//     return res.status(500).json({
//       error: error instanceof Error ? error.message : "Internal Server Error",
//       code: 500
//     });
//   }
// };

// /**
//  * Create a contract for user
//  */
// export const createContract = async (req: Request, res: Response) => {
//   try {
//     const { auth } = req as any;
//     let inputs = req.body;
//     const allowFields = {
//       id: "number!",
//       contractTypeId: "number!",
//       startDate: "date!",
//       endDate: "date",
//       activeDay: "date!",
//       insurance: "number",
//     };

//     let params = validate(inputs, allowFields, { removeNotAllow: true });

//     // Check if user exists
//     const user = await UserModel.getById(params.id);
//     if (!user) {
//       return res.status(404).json({ error: "User doesn't exist!", code: 6006 });
//     }

//     // Validate contract type
//     const contractType = await ContractTypeModel.query().findById(
//       params.contractTypeId
//     );
//     if (!contractType) {
//       return res.status(400).json({ error: "Contract Type not exists!", code: 5011 });
//     }

//     // Validate dates
//     if (
//       params.endDate &&
//       new Date(params.endDate) <= new Date(params.startDate)
//     ) {
//       return res.status(400).json({ error: "End date must be after start date!", code: 5009 });
//     }

//     if (new Date(params.activeDay) < new Date(params.startDate)) {
//       return res.status(400).json({
//         error: "Active day must be after or equal to start date!",
//         code: 5012
//       });
//     }

//     // Remove id to let DB auto-generate
//     delete params.id;

//     // Create contract
//     const contractData = {
//       ...params,
//       userId: inputs.id,
//       created_at: new Date(),
//     };

//     console.log("Contract data:", contractData);

//     const result = await ContractModel.insertOne(contractData);
//     return res.status(201).json(result);
//   } catch (error) {
//     console.error("Error creating contract:", error);

//     if (error instanceof ValidationException) {
//       return res.status(error.status).json({
//         error: error.message,
//         code: error.code
//       });
//     }

//     return res.status(500).json({
//       error: error instanceof Error ? error.message : "Internal Server Error",
//       code: 500
//     });
//   }
// };

// /**
//  * Helper function for upload validation
//  */
// const _beforeUpload = async ({ inputs, auth }) => {
//   let errors = {};
//   let warring = [];
//   const validationNormal = validateUpload([...inputs], {
//     allowFieldsOfRow: {
//       firstName: "string!",
//       lastName: "string!",
//       username: "string!",
//       password: "string!",
//       roleName: "string!",
//       email: "string!",
//       department: "string!",
//       chevron: "string!",
//       status: "string",
//       gender: "string",
//       phone: "string",
//       birthday: "string",
//       startDateUser: "string",
//       startDate: "string",
//       contractType: "string",
//       insurance: "number",
//       activeDay: "string",
//     },
//     removeNotAllow: true,
//     duplicate: true,
//     unique: ["username", "email"],
//     validationFields: {
//       email: [isEmail],
//     },
//   });

//   inputs = validationNormal.inputs;

//   if (Object.keys(validationNormal.errors).length > 0) {
//     return {
//       warring,
//       errors: validationNormal.errors,
//       data: inputs,
//     };
//   }

//   // Check username
//   const errorExistUsername = await validateNotAllowDataExistInDBByColumn({
//     inputs: JSON.parse(JSON.stringify(inputs)),
//     property: "username",
//     ignoreUndefined: true,
//     Model: UserModel,
//     column: "username",
//     extend_conditions: {},
//     error_code: "DATA_EXIST_IN_DB",
//     comment: "",
//   });

//   // Check role
//   const checkRole = await validateDataExistInDBByColumn({
//     inputs: JSON.parse(JSON.stringify(inputs)),
//     property: "roleName",
//     ignoreUndefined: true,
//     Model: RoleModel,
//     column: "name",
//     extend_conditions: {},
//     error_code: "ROLE_NOT_EXIST",
//     comment: "",
//     deleteProperties: ["roleName"],
//     setColumnsToProperties: [{ columnName: "id", newProperty: "roleId" }],
//   });
//   inputs = checkRole.inputs;

//   let errorExistEmail = {};

//   const checkDepartment = await validateDataExistInDBByColumn({
//     inputs: JSON.parse(JSON.stringify(inputs)),
//     property: "department",
//     ignoreUndefined: true,
//     Model: DepartmentModel,
//     column: "name",
//     extend_conditions: {},
//     error_code: "DEPARTMENT_NOT_EXIST",
//     comment: "",
//     deleteProperties: ["department"],
//     setColumnsToProperties: [
//       { columnName: "id", newProperty: "departmentId" },
//     ],
//   });
//   inputs = checkDepartment.inputs;

//   const checkChevron = await validateDataExistInDBByColumn({
//     inputs: JSON.parse(JSON.stringify(inputs)),
//     property: "chevron",
//     ignoreUndefined: true,
//     Model: ChevronModel,
//     column: "name",
//     extend_conditions: {},
//     error_code: "CHEVRON_NOT_EXIST",
//     comment: "",
//     deleteProperties: ["chevron"],
//     setColumnsToProperties: [{ columnName: "id", newProperty: "chevronId" }],
//   });
//   inputs = checkChevron.inputs;

//   const checkContractType = await validateDataExistInDBByColumn({
//     inputs: JSON.parse(JSON.stringify(inputs)),
//     property: "