import { Request, Response } from 'express';
import ContractModel from '@/src/Models/ContractModel';
import ContractTypeModel from '@/src/Models/ContractTypeModel';
import { validate, ValidationException } from '@/src/utils/validation-utility';

/**
 * Create a contract for a user
 */
export const createContract = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      userId: 'number!',
      contractTypeId: 'number!',
      startDate: 'date!',
      endDate: 'date',
      activeDay: 'date!',
    };

    // Prefer userId from URL param, fallback to body for backward compatibility
    const userIdFromParams = Number((req.params as any).userId);
    const composedBody = Number.isFinite(userIdFromParams)
      ? { ...req.body, userId: userIdFromParams }
      : req.body;

    const params = validate(composedBody, allowFields, { removeNotAllow: true });

    // Validate contract type exists
    const contractType = await ContractTypeModel.query().findById(params.contractTypeId);
    if (!contractType) {
      return res.status(400).json({ error: 'Contract Type not exists!', code: 5011 });
    }

    // Date validations
    if (params.endDate && new Date(params.endDate) <= new Date(params.startDate)) {
      return res.status(400).json({ error: 'End date must be after start date!', code: 5009 });
    }
    if (new Date(params.activeDay) < new Date(params.startDate)) {
      return res.status(400).json({ error: 'Active day must be after or equal to start date!', code: 5012 });
    }

    const data: any = {
      ...params,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await ContractModel.query().insert(data);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof ValidationException) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error('Error creating contract:', error);
    return res.status(500).json({ error: 'Internal Server Error', code: 500 });
  }
};

/**
 * Get contracts by user id
 */
export const getContractsByUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Fetch contracts and join contract type to enrich with name/term/insurance
    const contracts = await ContractModel.query()
      .where('userId', userId)
      .withGraphFetched('contractType');

    const result = contracts.map((c: any) => ({
      ...c,
      contractType: c.contractType
        ? {
            id: c.contractType.id,
            name: c.contractType.name,
            contractTerm: c.contractType.contractTerm,
          }
        : null,
      insurance: c.contractType ? c.contractType.insurance : null,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching contracts by user:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Delete all contracts for a user
 */
export const deleteContractsByUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    await ContractModel.query().delete().where('userId', userId);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error('Error deleting contracts by user:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


