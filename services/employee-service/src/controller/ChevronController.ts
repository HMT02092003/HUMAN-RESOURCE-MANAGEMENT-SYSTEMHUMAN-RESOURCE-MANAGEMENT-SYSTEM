import { Request, Response } from "express";
import ChevronModel from "@/src/Models/ChevronModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";

/**
 * Get all chevrons from the database with optional search, sort, and pagination
 */
export const getAllChevrons = async (req: Request, res: Response) => {
  try {
    const inputs = req.query;
    const project = [
      "chevrons.id",
      "chevrons.name",
      "chevrons.description",
      "chevrons.chevronCoefficient",
      "chevrons.role_ids",
      "chevrons.created_at",
      "chevrons.updated_at",
    ];

    let result = await ChevronModel.query()
      .select(project)
      .modify((queryBuilder) => {
        // Apply search filter
        if (inputs.search) {
          queryBuilder.where((builder) => {
            builder.where('name', 'like', `%${inputs.search}%`)
              .orWhere('description', 'like', `%${inputs.search}%`);
          });
        }

        // Add pagination if provided
        if (inputs.page && inputs.limit) {
          const page = Number(inputs.page) || 1;
          const limit = Number(inputs.limit) || 10;
          queryBuilder.offset((page - 1) * limit).limit(limit);
        }

        // Add sorting if provided
        if (inputs.sort && inputs.order) {
          const order = inputs.order === 'asc' || inputs.order === 'desc' ? inputs.order : 'asc';
          queryBuilder.orderBy(inputs.sort as string, order);
        }
      });

    // Get total count for pagination
    let countQuery = ChevronModel.query().count('id as count');
    if (inputs.search) {
      countQuery = countQuery.where((builder) => {
        builder.where('name', 'like', `%${inputs.search}%`)
          .orWhere('description', 'like', `%${inputs.search}%`);
      });
    }
    const totalCount = await countQuery.first();

    return res.status(200).json({
      data: result,
      total: totalCount ? (totalCount as any).count : 0
    });
  } catch (error) {
    console.error("Error fetching chevrons:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Get all chevrons for select dropdown (no pagination)
 */
export const getAllChevronsList = async (req: Request, res: Response) => {
  try {
    const { role_id } = req.query;
    let query = ChevronModel.query().select(['id', 'name', 'chevronCoefficient']);

    if (role_id) {
      query = query.whereRaw('? = ANY(role_ids)', [role_id]);
    }

    const result = await query.orderBy('name', 'asc');
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching chevrons for select:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Create a new chevron
 */
export const createChevron = async (req: Request, res: Response) => {
  try {
    let inputs = req.body;
    // console.log("Received inputs:", inputs);

    const allowFields = {
      name: "string!",
      description: "string",
      chevronCoefficient: "number!",
      role_ids: "any",
    };

    let params = validate(inputs, allowFields, { removeNotAllow: true });
    console.log("Validated params:", params);

    const existingChevron = await ChevronModel.query().findOne({
      name: params.name,
    });

    if (existingChevron) {
      return res.status(400).json({ error: "Chevron already exists!" });
    }

    const data = {
      name: params.name,
      description: params.description || null,
      chevronCoefficient: params.chevronCoefficient,
      role_ids: params.role_ids || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await ChevronModel.query().insert(data as Partial<ChevronModel>);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating chevron:", error);

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
 * Get chevron details by ID
 */
export const getChevronDetail = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!",
    };

    let inputs = req.body;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    let result = await ChevronModel.query().findById(params.id);
    if (!result) {
      return res.status(404).json({ error: "Chevron doesn't exist!" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching chevron detail:", error);

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
 * Update an existing chevron
 */
export const updateChevron = async (req: Request, res: Response) => {
  try {
    let inputs = req.body;
    const allowFields = {
      id: "number!",
      name: "string!",
      description: "string",
      chevronCoefficient: "number!",
      role_ids: "any",
    };

    let params = validate(inputs, allowFields, { removeNotAllow: true });
    console.log("Received params:", params);

    const { id } = params;
    const updateData = {
      name: params.name,
      description: params.description || null,
      chevronCoefficient: params.chevronCoefficient,
      role_ids: params.role_ids,
      updated_at: new Date()
    };

    // Check if chevron exists
    let exist = await ChevronModel.query().findById(id);
    if (!exist) {
      return res.status(404).json({ error: "Chevron doesn't exist!" });
    }

    // Check if name is already taken by another chevron
    let nameExist = await ChevronModel.query()
      .where("name", params.name)
      .whereNot("id", id).skipUndefined()
      .first();

    console.log("Name exist:", nameExist);
    if (nameExist) {
      return res.status(400).json({ error: "Chevron name already exists!" });
    }

    // Update the chevron
    let result = await ChevronModel.query().patchAndFetchById(id, updateData);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating chevron:", error);

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
 * Delete a chevron by ID
 */
export const deleteChevron = async (req: Request, res: Response) => {
  try {
    // Lấy id từ query và chuyển sang number
    const id = parseInt(req.query.id as string, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "id phải là số!" });
    }

    // Check if chevron exists
    let exist = await ChevronModel.query().findById(id);
    if (!exist) {
      return res.status(404).json({ error: "Chevron doesn't exist!" });
    }

    // Delete the chevron
    await ChevronModel.query().deleteById(id);

    return res.status(200).json({
      message: "Delete successful",
      deletedChevron: exist
    });
  } catch (error) {
    console.error("Error deleting chevron:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

/**
 * Delete multiple chevrons by IDs
 */
export const deleteMultipleChevrons = async (req: Request, res: Response) => {
  try {
    console.log("Received request to delete multiple chevrons:", req.body);

    // Lấy ids trực tiếp từ body
    const { ids } = req.body;

    // Kiểm tra ids có phải là mảng không
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids phải là một mảng và không được rỗng!" });
    }

    // Chuyển đổi tất cả ids sang number
    const numericIds: number[] = ids.map((id: any) => {
      const numId = typeof id === 'number' ? id : parseInt(id, 10);
      if (isNaN(numId)) {
        throw new Error(`Invalid id: ${id}`);
      }
      return numId;
    });

    console.log("Numeric IDs:", numericIds);

    // Check if all chevrons exist
    let existingChevrons = await ChevronModel.query().whereIn("id", numericIds);
    if (!existingChevrons || existingChevrons.length !== numericIds.length) {
      return res.status(404).json({ error: "One or more chevrons don't exist!" });
    }

    // Delete the chevrons
    for (let chevron of existingChevrons) {
      await ChevronModel.query().deleteById(chevron.id);
    }

    return res.status(200).json({
      message: `Successfully deleted ${existingChevrons.length} chevrons`,
      deletedChevrons: existingChevrons
    });
  } catch (error) {
    console.error("Error deleting multiple chevrons:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      code: 500
    });
  }
};

/**
 * Get chevrons for select2 dropdown component
 */
export const getChevronSelect2 = async (req: Request, res: Response) => {
  try {
    const data = req.query;
    const project = ["name as label", "id as value"];

    // Assuming there's a getForGridTable method on the query builder
    let result = await ChevronModel.query()
      .select(project)
      .modify((queryBuilder) => {
        // Apply filters from query params if needed
        if (data.search) {
          queryBuilder.where('name', 'like', `%${data.search}%`);
        }

        if (data.role_id) {
          queryBuilder.whereRaw('? = ANY(role_ids)', [data.role_id]);
        }

        // Add pagination
        if (data.page && data.limit) {
          const page = Number(data.page) || 1;
          const limit = Number(data.limit) || 10;
          queryBuilder.offset((page - 1) * limit).limit(limit);
        }
      });

    // Get total count for pagination
    const totalCount = await ChevronModel.query().count('id as count').first();

    return res.status(200).json({
      data: result,
      total: totalCount ? (totalCount as any).count : 0
    });
  } catch (error) {
    console.error("Error fetching chevrons for select2:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};