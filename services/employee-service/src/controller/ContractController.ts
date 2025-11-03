import { Request, Response } from 'express';
import ContractModel from '@/src/Models/ContractModel';
import ContractTypeModel from '@/src/Models/ContractTypeModel';
import { validate, ValidationException } from '@/src/utils/validation-utility';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const SALARY_SERVICE_URL = process.env.SALARY_SERVICE_URL || 'http://localhost:4004/api';

/**
 * Create a contract for a user with salary profile
 */
export const createContract = async (req: Request, res: Response) => {
  try {
    const allowFields = {
      userId: 'number!',
      contractTypeId: 'number!',
      startDate: 'date!',
      endDate: 'date',
      activeDay: 'date!',
      // salary should be a number (coerced if a string is provided)
      salary: 'number',
      // allowance_type_ids is an array of numbers (use array syntax so validator recurses elements)
      allowance_type_ids: ['number'],
    };
    console.log('Creating contract with body:', req.body);
    // If this is the debug route, persist the raw body to a file for reliable inspection
    try {
      if (req.originalUrl && req.originalUrl.includes('/debug/')) {
  const outPath = path.resolve(__dirname, '../../tmp_debug_requests.log');
        const entry = {
          timestamp: new Date().toISOString(),
          url: req.originalUrl,
          body: req.body,
          headers: req.headers,
        };
        fs.appendFileSync(outPath, JSON.stringify(entry) + '\n');
      }
    } catch (err) {
      // ignore logging errors
    }
    const params = validate(req.body, allowFields, { removeNotAllow: true });
    console.log('Creating contract with params:', params);

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

    // Extract salary fields
    const { salary, allowance_type_ids, ...contractData } = params;

    const data: any = {
      ...contractData,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Create contract first
    const contract = await ContractModel.query().insert(data);

    console.log('Salary:', params.salary);

    // If salary information is provided, create salary profile
    if (salary !== undefined && salary !== null) {
      try {
        const salaryPayload = {
          user_id: String(params.userId),
          salary: salary,
          allowance_type_ids: allowance_type_ids || [],
        };

        console.log('Creating salary profile for contract:', contract.id, salaryPayload);

        await axios.post(
          `${SALARY_SERVICE_URL}/contracts/${contract.id}/salary-profile`,
          salaryPayload
        );

        console.log('Salary profile created successfully for contract:', contract.id);
      } catch (salaryError: any) {
        console.error('Error creating salary profile:', salaryError.response?.data || salaryError.message);
        // Don't fail the contract creation if salary profile fails
        // Just log the error
      }
    }

    return res.status(201).json(contract);
  } catch (error) {
    if (error instanceof ValidationException) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error('Error creating contract:', error);
    return res.status(500).json({ error: 'Internal Server Error', code: 500 });
  }
};

/**
 * Get active contract for a user at a specific date
 */
export const getActiveContract = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Find contract where activeDay <= date and (endDate is null or endDate >= date)
    const contract = await ContractModel.query()
      .where('userId', userId)
      .where('activeDay', '<=', date)
      .where(function() {
        this.whereNull('endDate').orWhere('endDate', '>=', date);
      })
      .withGraphFetched('contractType')
      .orderBy('activeDay', 'desc')
      .first();

    if (!contract) {
      return res.status(404).json({ error: 'No active contract found for this user' });
    }

    return res.status(200).json(contract);
  } catch (error) {
    console.error('Error fetching active contract:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
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


