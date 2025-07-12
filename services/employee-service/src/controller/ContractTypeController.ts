import { Request, Response } from "express";
import ContractType from "@/src/Models/ContractTypeModel";
import ContractModel from "@/src/Models/ContractModel";
import { validate, ValidationException } from "@/src/utils/validation-utility";

/**
 * Get all contract types from the database
 */
export const getAllContractTypes = async (req: Request, res: Response) => {
    try {
        let inputs = req.query;
        let project = [
            "contract_types.id as id",
            "contract_types.name",
            "contract_types.description",
            "contract_types.contractTerm",
            "contract_types.created_at",
            "contract_types.insurance",
            "contract_types.type",
        ];

        let result = await ContractType.query()
            .select(project)
            .modify((queryBuilder) => {
                // Apply filters and pagination based on inputs
                if (inputs.search) {
                    queryBuilder.where('name', 'like', `%${inputs.search}%`);
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
        const totalCount = await ContractType.query().count('id as count').first();

        return res.status(200).json({
            data: result,
            total: totalCount ? (totalCount as any).count : 0
        });
    } catch (error) {
        console.error("Error fetching contract types:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * Create a new contract type
 */
export const createContractType = async (req: Request, res: Response) => {
    try {
        let inputs = req.body;
        console.log('Received inputs:', inputs);

        const allowFields = {
            name: "string!",
            description: "string",
            contractTerm: 'number',
            type: 'number',
            insurance: 'number',
        };

        let params = validate(inputs, allowFields, { removeNotAllow: true });
        console.log("Validated params:", params);

        if (params.contractTerm && params.contractTerm < 0) {
            return res.status(400).json({ error: "Thời hạn hợp đồng phải là số dương!" });
        }

        const existingContractType = await ContractType.query().findOne({
            name: params.name,
        });

        if (existingContractType) {
            return res.status(400).json({ error: "Loại hợp đồng đã tồn tại!" });
        }

        const data = {
            ...params,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const result = await ContractType.query().insert(data as Partial<ContractType>);
        return res.status(201).json(result);
    } catch (error) {
        console.error("Error creating contract type:", error);

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
 * Get contract type details by ID
 */
export const getContractTypeDetail = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        console.log("Received contract type ID:", id);

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid contract type ID" });
        }

        const input = { id };
        const allowFields = {
            id: "number!"
        };

        let params = validate(input, allowFields, { removeNotAllow: true });

        let result = await ContractType.query().findById(params.id);
        if (!result) {
            return res.status(404).json({ error: "Không tìm thấy bản ghi loại hợp đồng!" });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching contract type detail:", error);

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
 * Get contract types for select2 dropdown component
 */
export const getContractTypeSelect2 = async (req: Request, res: Response) => {
    try {
        const data = req.query;
        const project = ["name as label", "id as value"];

        let result = await ContractType.query()
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
        const totalCount = await ContractType.query().count('id as count').first();

        return res.status(200).json({
            data: result,
            total: totalCount ? (totalCount as any).count : 0
        });
    } catch (error) {
        console.error("Error fetching contract types for select2:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * Update an existing contract type
 */
export const updateContractType = async (req: Request, res: Response) => {
    try {
        let inputs = req.body;
        const allowFields = {
            id: "number!",
            name: "string!",
            description: "string!",
            contractTerm: 'number!',
            type: 'number!',
            insurance: 'number!',
        };

        let params = validate(inputs, allowFields, { removeNotAllow: true });
        console.log("Received params:", params);

        // Validate contractTerm
        if (params.contractTerm < 0) {
            return res.status(400).json({ error: "Thời hạn hợp đồng phải là số dương!" });
        }

        const { id } = params;
        const updateData = {
            name: params.name,
            description: params.description,
            contractTerm: params.contractTerm,
            type: params.type,
            insurance: params.insurance,
            updated_at: new Date()
        };

        // Check if contract type exists
        let exist = await ContractType.query().findById(id);
        if (!exist) {
            return res.status(404).json({ error: "Không tìm thấy bản ghi!" });
        }

        // Check if name is already taken by another contract type
        let nameExist = await ContractType.query()
            .where("name", params.name)
            .whereNot("id", id)
            .first();

        if (nameExist) {
            return res.status(400).json({ error: "Loại hợp đồng đã tồn tại!" });
        }

        // Update the contract type
        let result = await ContractType.query().patchAndFetchById(id, updateData);

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error updating contract type:", error);

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
 * Delete a contract type by ID
 */
export const deleteContractType = async (req: Request, res: Response) => {
    try {
        const allowFields = {
            id: "number!",
        };

        let inputs = req.query;
        let params = validate(inputs, allowFields, { removeNotAllow: true });

        // Check if contract type exists
        let exist = await ContractType.query().findById(params.id);
        if (!exist) {
            return res.status(404).json({ error: "Không tìm thấy bản ghi loại hợp đồng!" });
        }

        // Check if contract type is being used by contracts
        let checkContract = await ContractModel.query().where('contractTypeId', params.id);
        if (checkContract.length > 0) {
            return res.status(400).json({ error: "Loại hợp đồng đang được sử dụng, không thể xóa!" });
        }

        // Delete the contract type
        await ContractType.query().deleteById(params.id);

        return res.status(200).json({
            message: "Delete successfully",
            deletedContractType: exist
        });
    } catch (error) {
        console.error("Error deleting contract type:", error);

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
 * Delete multiple contract types by IDs
 */
export const deleteMultipleContractTypes = async (req: Request, res: Response) => {
    try {
        console.log("Received request to delete multiple contract types:", req);
        const allowFields = {
            ids: ["number!"],
        };

        let inputs = req.body;
        let params = validate(inputs, allowFields, { removeNotAllow: true });

        console.log("Validated params:", params);

        // Check if all contract types exist
        let existingContractTypes = await ContractType.query().whereIn("id", params.ids);
        if (!existingContractTypes || existingContractTypes.length !== params.ids.length) {
            return res.status(404).json({ error: "Không tìm thấy bản ghi loại hợp đồng!" });
        }

        // Check if any contract type is being used by contracts
        let checkContract = await ContractModel.query().whereIn('contractTypeId', params.ids);
        if (checkContract.length > 0) {
            return res.status(400).json({ error: "Loại hợp đồng đang được sử dụng, không thể xóa!" });
        }

        // Delete the contract types
        for (let contractType of existingContractTypes) {
            await ContractType.query().deleteById(contractType.id);
        }

        return res.status(200).json({
            message: `Successfully deleted ${existingContractTypes.length} contract types`,
            deletedContractTypes: existingContractTypes
        });
    } catch (error) {
        console.error("Error deleting multiple contract types:", error);

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