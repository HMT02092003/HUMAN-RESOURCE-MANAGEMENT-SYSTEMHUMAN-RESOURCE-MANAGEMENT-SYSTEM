import { Request, Response } from "express";
import DepartmentModel from "@/src/Models/DepartmentModel";
import UserModel from "@/src/Models/UserModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";
import AuthService from "@/src/integrations/AuthService";
/**
 * Get all departments from the database
 */
export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    let inputs = req.query;
    let project = [
      "departments.id as id",
      "departments.name",
      "departments.description",
      "departments.created_at",
    ];

    let result = await DepartmentModel.query()
      .select(project)
      .modify((queryBuilder) => {
        // Apply filters and pagination based on inputs
        if (inputs.search) {
          // If a specific column is requested, search only that column
          const sf = inputs.search_field as string | undefined;
          if (sf && (sf === 'name' || sf === 'description')) {
            queryBuilder.where(sf, 'like', `%${inputs.search}%`);
          } else {
            queryBuilder.where((builder) => {
              builder.where('name', 'like', `%${inputs.search}%`)
                .orWhere('description', 'like', `%${inputs.search}%`);
            });
          }
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

    // Get total count for pagination (with same search filter)
    // Build count query with same search filter
    let countQuery = DepartmentModel.query().count('id as count');
    if (inputs.search) {
      const sf = inputs.search_field as string | undefined;
      if (sf && (sf === 'name' || sf === 'description')) {
        countQuery = countQuery.where(sf, 'like', `%${inputs.search}%`);
      } else {
        countQuery = countQuery.where((builder) => {
          builder.where('name', 'like', `%${inputs.search}%`)
            .orWhere('description', 'like', `%${inputs.search}%`);
        });
      }
    }
    const totalCount = await countQuery.first();

    return res.status(200).json({
      data: result,
      total: totalCount ? (totalCount as any).count : 0
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Get all departments for select dropdown (no pagination)
 */
export const getAllDepartmentsList = async (req: Request, res: Response) => {
  try {
    let result = await DepartmentModel.query()
      .select(['id', 'name'])
      .orderBy('name', 'asc');

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching departments for select:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Create a new department
 */
export const createDepartment = async (req: Request, res: Response) => {
  try {
    let inputs = req.body;
    console.log('Received inputs:', inputs);

    const allowFields = {
      name: "string!",
      description: "string",
    };

    let params = validate(inputs, allowFields, { removeNotAllow: true });
    console.log("Validated params:", params);

    // Validation độ dài tên department (tối đa 20 ký tự)
    if (params.name && params.name.length > 20) {
      return res.status(400).json({
        error: "Tên phòng ban không được vượt quá 20 ký tự!",
        code: 400
      });
    }

    const existingDepartment = await DepartmentModel.query().findOne({
      name: params.name,
    });

    if (existingDepartment) {
      return res.status(400).json({ error: "Department already exists!" });
    }

    const data = {
      name: params.name,
      description: params.description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await DepartmentModel.query().insert(data as Partial<DepartmentModel>);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating department:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.status
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

export const getDepartmentDetail = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log("Received department ID:", id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid department ID" });
    }

    const input = { id };

    const allowFields = {
      id: "number!",
    };

    let params = validate(input, allowFields, { removeNotAllow: true });


    let result = await DepartmentModel.query().findById(params.id);
    if (!result) {
      return res.status(404).json({ error: "Department doesn't exist!" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching department detail:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.status
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

/**
 * Get departments for select2 dropdown component
 */
export const getDepartmentSelect2 = async (req: Request, res: Response) => {
  try {
    const data = req.query;
    const project = ["name as label", "id as value"];

    let result = await DepartmentModel.query()
      .select(project)
      .modify((queryBuilder) => {
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
    const totalCount = await DepartmentModel.query().count('id as count').first();

    return res.status(200).json({
      data: result,
      total: totalCount ? (totalCount as any).count : 0
    });
  } catch (error) {
    console.error("Error fetching departments for select2:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Update an existing department
 */
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    let inputs = req.body;
    const allowFields = {
      id: "number!",
      name: "string!",
      description: "string",
    };

    let params = validate(inputs, allowFields, { removeNotAllow: true });
    console.log("Received params:", params);

    // Validation độ dài tên department (tối đa 20 ký tự)
    if (params.name && params.name.length > 20) {
      return res.status(400).json({
        error: "Tên phòng ban không được vượt quá 20 ký tự!",
        code: 400
      });
    }

    const { id } = params;
    const updateData = {
      name: params.name,
      description: params.description,
      updated_at: new Date()
    };

    // Check if department exists
    let exist = await DepartmentModel.query().findById(id);
    if (!exist) {
      return res.status(404).json({ error: "Department doesn't exist!" });
    }

    // Check if name is already taken by another department
    let nameExist = await DepartmentModel.query()
      .where("name", params.name)
      .whereNot("id", id)
      .first();

    if (nameExist) {
      return res.status(400).json({ error: "Department name already exists!" });
    }

    // Update the department
    let result = await DepartmentModel.query().patchAndFetchById(id, updateData);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating department:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.status
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

/**
 * Delete a department by ID
 */
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!",
    };

    let inputs = req.query;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    // Check if department exists
    let exist = await DepartmentModel.query().findById(params.id);
    if (!exist) {
      return res.status(404).json({ error: "Department doesn't exist!" });
    }

    // Check if department is being used by users via auth-service
    // Forward authorization header from original request
    const authHeader = req.headers.authorization;
    const headers: any = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const users = await AuthService.getUsersByDepartment(params.id, headers.Authorization);
    if (users && users.length > 0) {
      return res.status(400).json({ error: "Phòng ban đang được sử dụng, không thể xóa!" });
    }

    // Delete the department
    await DepartmentModel.query().deleteById(params.id);

    return res.status(200).json({
      message: "Delete successful",
      deletedDepartment: exist
    });
  } catch (error) {
    console.error("Error deleting department:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

/**
 * Delete multiple departments by IDs
 */
export const deleteMultipleDepartments = async (req: Request, res: Response) => {
  try {
    console.log("Received request to delete multiple departments:", req);
    const allowFields = {
      ids: ["number!"],
    };

    let inputs = req.body;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    console.log("Validated params:", params);

    // Check if all departments exist
    let existingDepartments = await DepartmentModel.query().whereIn("id", params.ids);
    if (!existingDepartments || existingDepartments.length !== params.ids.length) {
      return res.status(404).json({ error: "One or more departments don't exist!" });
    }

    // Check if any department is being used by users via auth-service
    // Forward authorization header from original request
    const authHeader = req.headers.authorization;
    const headers: any = {};
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    // Gửi departmentIds dưới dạng array thay vì string
    const users = await AuthService.getUsersByDepartment(params.ids, headers.Authorization);
    if (users && users.length > 0) {
      return res.status(400).json({ error: "Phòng ban đang được sử dụng, không thể xóa!" });
    }

    // Delete the departments
    for (let department of existingDepartments) {
      await DepartmentModel.query().deleteById(department.id);
    }

    return res.status(200).json({
      message: `Successfully deleted ${existingDepartments.length} departments`,
      deletedDepartments: existingDepartments
    });
  } catch (error) {
    console.error("Error deleting multiple departments:", error);

    if (error instanceof ValidationException) {
      return res.status(error.status).json({
        error: error.message,
        code: error.status
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};
