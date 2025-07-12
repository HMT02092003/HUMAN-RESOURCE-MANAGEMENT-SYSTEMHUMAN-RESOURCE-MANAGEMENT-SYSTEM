import { Request, Response } from "express";
import ChevronModel from "@/src/Models/ChevronModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";
import { console } from "inspector";

/**
 * Get all chevrons from the database
 */
export const getAllChevrons = async (req: Request, res: Response) => {
  try {
    const result = await ChevronModel.query().select("chevrons.*");
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching chevrons:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Create a new chevron
 */
export const createChevron = async (req: Request, res: Response) => {
  try {
    let inputs = req.body;
    console.log("Received inputs:", inputs);

    const allowFields = {
      name: "string!",
      description: "string",
      chevronCoefficient: "number!",
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
    };

    let params = validate(inputs, allowFields, { removeNotAllow: true });
    console.log("Received params:", params);

    const { id } = params;
    const updateData = {
      name: params.name,
      description: params.description || null,
      chevronCoefficient: params.chevronCoefficient,
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
      .whereNot("id", id)
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
 * Delete a chevron by ID
 */
export const deleteChevron = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      id: "number!",
    };

    let inputs = req.query;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    // Check if chevron exists
    let exist = await ChevronModel.query().findById(params.id);
    if (!exist) {
      return res.status(404).json({ error: "Chevron doesn't exist!" });
    }

    // Delete the chevron
    await ChevronModel.query().deleteById(params.id);

    return res.status(200).json({
      message: "Delete successful",
      deletedChevron: exist
    });
  } catch (error) {
    console.error("Error deleting chevron:", error);

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
 * Delete multiple chevrons by IDs
 */
export const deleteMultipleChevrons = async (req: Request, res: Response) => {
  try {
    console.log("Received request to delete multiple chevrons:", req);
    const allowFields = {
      ids: ["number!"],
    };

    let inputs = req.body;
    let params = validate(inputs, allowFields, { removeNotAllow: true });

    console.log("Validated params:", params);

    // Check if all chevrons exist
    let existingChevrons = await ChevronModel.query().whereIn("id", params.ids);
    if (!existingChevrons || existingChevrons.length !== params.ids.length) {
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