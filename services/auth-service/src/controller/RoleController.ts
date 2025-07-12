import { Request, Response } from "express";
import RoleModel from "@/src/Models/RoleModel";
import UserModel from "@/src/Models/UserModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";
import constantConfig from "@/src/config/constant";
import _ from "lodash";

const { roleKey } = constantConfig;

/**
 * Get all roles from the database
 */
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const inputs = req.query;
    const project = ['roles.*', 'ag.name as parentName'];

    let result = await RoleModel.query()
      .leftJoin('roles as ag', 'roles.parentId', 'ag.id')
      .select(project)
      // .whereNot('roles.name', roleKey.root)
      .modify((queryBuilder: any) => {
        // Apply filters and pagination based on inputs
        if (inputs.search) {
          queryBuilder.where('roles.name', 'like', `%${inputs.search}%`);
        }

        // Add pagination if provided
        if (inputs.page && inputs.limit) {
          const page = Number(inputs.page) || 1;
          const limit = Number(inputs.limit) || 10;
          queryBuilder.offset((page - 1) * limit).limit(limit);
        }

        // Add sorting if provided
        if (inputs.sort && inputs.order) {
          const order = inputs.order === 'asc' || inputs.order === 'desc' ? inputs.order : undefined;
          queryBuilder.orderBy(inputs.sort as string, order);
        }
      });

    // Get total count for pagination
    const totalCount = await RoleModel.query()
      .whereNot('key', roleKey.root)
      .count('id as count')
      .first();

    return res.status(200).json({
      data: result,
      total: totalCount ? (totalCount as any).count : 0
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

/**
 * Get role details by ID
 */
export const getRoleDetail = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!"
    };

    let inputs = req.params;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    let result = await RoleModel.query().findById(params.id);
    if (!result) {
      return res.status(404).json({ error: "Vai trò không tồn tại!" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching role detail:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Get roles for select2 dropdown component
 */
export const getRoleSelect2 = async (req: Request, res: Response) => {
  try {
    const data = req.query;
    const project = [
      'name as label',
      'id as value'
    ];

    let result = await RoleModel.query()
      .select(project)
      .modify((queryBuilder: any) => {
        // Apply filters from query params if needed
        if (data.search) {
          queryBuilder.where('name', 'like', `%${data.search}%`);
        }

        // Add pagination
        if (data.page && data.limit) {
          const page = Number(data.page) || 1;
          const limit = Number(data.limit) || 10;
          queryBuilder.offset((page - 1) * limit).limit(limit);
        }
      });

    // Get total count for pagination
    const totalCount = await RoleModel.query().count('id as count').first();

    return res.status(200).json({
      data: result,
      total: totalCount ? (totalCount as any).count : 0
    });
  } catch (error) {
    console.error("Error fetching roles for select2:", error);
    return res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

/**
 * Get parent roles for select2 dropdown component
 */
export const getParentRoleSelect = async (req: Request, res: Response) => {
  try {
    const data = req.query;
    let { id = null } = data;

    const project = [
      'name as label',
      'id as value'
    ];

    let query = RoleModel.query()
      .whereNull('parentId')
      .select(project);

    if (id && !isNaN(Number(id))) {
      query = query.whereNot('id', Number(id));
    }

    query = query.modify((queryBuilder: any) => {
      // Apply filters from query params if needed
      if (data.search) {
        queryBuilder.where('name', 'like', `%${data.search}%`);
      }

      // Add pagination
      if (data.page && data.limit) {
        const page = Number(data.page) || 1;
        const limit = Number(data.limit) || 10;
        queryBuilder.offset((page - 1) * limit).limit(limit);
      }
    });

    let result = await query;

    // Get total count for pagination
    const totalCount = await RoleModel.query()
      .whereNull('parentId')
      .count('id as count')
      .first();

    return res.status(200).json({
      data: result,
      total: totalCount ? (totalCount as any).count : 0
    });
  } catch (error) {
    console.error("Error fetching parent roles for select:", error);
    return res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

/**
 * Create a new role
 */
export const createRole = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      name: "string!",
      description: "string",
    };

    let inputs = req.body;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    // Trim name
    let name = params.name.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    params.name = name;

    console.log("params", params)

    // Check if role name already exists
    const existingRole = await RoleModel.query().where('name', params.name).first();
    if (existingRole) {
      return res.status(400).json({ error: "Vai trò đã tồn tại!" });
    }

    const data = {
      ...params,
      createdBy: req.auth?.id,
    } as any;

    const result = await RoleModel.query().insert(data);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating role:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Update an existing role
 */
export const updateRole = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!",
      name: "string!",
      description: "string",
    };

    let inputs = req.body;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    const { id, parentId } = params;

    // Check if role exists
    let exist = await RoleModel.query().findById(id);
    if (!exist) {
      return res.status(404).json({ error: "Vai trò không tồn tại!" });
    }

    // Check if name is already taken by another role
    let existUserGroupName = await RoleModel.query().where('name', params.name).first();
    if (existUserGroupName && existUserGroupName.id != id) {
      return res.status(400).json({ error: "Tên vai trò đã tồn tại!" });
    }

    const updateData = {
      name: params.name,
      description: params.description,
      updatedBy: req.auth?.id,
    };

    // Update the role
    let result = await RoleModel.query().patchAndFetchById(id, updateData);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating role:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Delete a role by ID
 */
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!"
    };

    let inputs = req.query;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    // Check if role exists
    let role = await RoleModel.query().findById(params.id);
    if (!role) {
      return res.status(404).json({ error: "Vai trò không tồn tại!" });
    }

    // Cannot delete root group
    if (role.key === roleKey.root) {
      return res.status(400).json({ error: "Không thể xóa nhóm gốc!" });
    }

    // Check if role is being used by users
    let checkUser = await UserModel.query().where('roleId', role.id);
    if (checkUser && checkUser.length > 0) {
      return res.status(400).json({ error: "Không thể xóa vai trò đang được sử dụng bởi người dùng!" });
    }

    // Delete the role
    await RoleModel.query().deleteById(role.id);

    return res.status(200).json({
      message: "Xóa thành công",
      deletedRole: role
    });
  } catch (error) {
    console.error("Error deleting role:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};

/**
 * Delete multiple roles by IDs
 */
export const deleteMultipleRoles = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      ids: ["number!"]
    };

    let inputs = req.body;
    let params = validate(inputs, allowFields);

    // Check if all roles exist
    let roles = await RoleModel.query().whereIn('id', params.ids);
    if (roles.length !== params.ids.length) {
      return res.status(404).json({ error: "Vai trò không tồn tại!" });
    }

    // Check if trying to delete root role
    let rootRole = roles.find((role) => (role as any).key === roleKey.root);
    if (rootRole) {
      return res.status(400).json({ error: "Không thể xóa nhóm gốc!" });
    }

    // Check if any role is being used by users
    let checkUser = await UserModel.query().whereIn('roleId', params.ids);
    if (!_.isEmpty(checkUser)) {
      return res.status(400).json({ error: "Không thể xóa vai trò đang được sử dụng bởi người dùng!" });
    }

    // Delete the roles
    for (let role of roles) {
      await RoleModel.query().deleteById(role.id);
    }

    return res.status(200).json({
      message: `Đã xóa thành công ${roles.length} vai trò`,
      deletedRoles: roles
    });
  } catch (error) {
    console.error("Error deleting multiple roles:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Lỗi máy chủ nội bộ",
      code: 500
    });
  }
};