import { Request, Response } from 'express';
import ContractModel from '@/src/Models/ContractModel';
import ContractTypeModel from '@/src/Models/ContractTypeModel';
import { validate, ValidationException } from '@/src/utils/validation-utility';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Salary service in this workspace currently runs on 4007 (check /services/salary-service/server.js or env)
const SALARY_SERVICE_URL = process.env.SALARY_SERVICE_URL || 'http://localhost:4007/api';

/**
 * Create a contract for a user with salary profile
 */
export const createContract = async (req: Request, res: Response) => {
  try {
    const params = req.body;
    
    // Get userId from URL params or body (prioritize URL params)
    const userIdFromUrl = req.params.userId;
    const userId = userIdFromUrl ? parseInt(userIdFromUrl) : params.userId;

    console.log('=== CREATE CONTRACT START ===');
    console.log('Request params:', req.params);
    console.log('Request body:', params);
    console.log('Extracted userId:', userId);

    // Validate userId exists
    if (!userId) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ID người dùng!', code: 5013 });
    }

    // Validate contract type exists
    const contractType = await ContractTypeModel.query().findById(params.contractTypeId);
    if (!contractType) {
      return res.status(400).json({ error: 'Loại hợp đồng không tồn tại!', code: 5011 });
    }

    // Date validations
    if (params.endDate && new Date(params.endDate) <= new Date(params.startDate)) {
      return res.status(400).json({ error: 'Ngày kết thúc phải sau ngày ký!', code: 5009 });
    }
    if (new Date(params.activeDay) < new Date(params.startDate)) {
      return res.status(400).json({ error: 'Ngày bắt đầu phải sau hoặc bằng ngày ký!', code: 5012 });
    }

  // Extract salary fields and strip contractTerm (not a column on contracts table)
  // contractTerm belongs to contract_types, not contracts, so remove it if present
  const { salary, allowance_type_ids, contractTerm, ...contractData } = params;

    // Prepare contract data with userId
    const data: any = {
      ...contractData,
      userId: userId, // Đảm bảo userId được lưu vào contract
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log('Creating contract with data:', data);

    // Create contract
    const contract = await ContractModel.query().insert(data);

    console.log('Contract created successfully:', contract);

    // If salary information is provided, create salary profile
    if (salary !== undefined && salary !== null) {
      try {
        // Validate salary before sending to salary-service to avoid DB numeric overflow
        const MAX_INTEGER_DIGITS = 12; // decimal(14,2) allows up to 12 integer digits
        const MAX_SALARY = 999999999999.99; // 12 nines with 2 decimal places

        const parsedSalary = Number(salary);
        if (isNaN(parsedSalary) || !isFinite(parsedSalary) || parsedSalary < 0) {
          // Invalid salary value
          // Rollback created contract and report error
          try { await ContractModel.query().deleteById(contract.id); } catch (_) {}
          return res.status(400).json({ error: 'Giá trị lương không hợp lệ', code: 7010 });
        }

        if (Math.abs(parsedSalary) > MAX_SALARY) {
          try { await ContractModel.query().deleteById(contract.id); } catch (_) {}
          return res.status(400).json({
            error: `Lương vượt quá giới hạn cho phép (tối đa ${MAX_SALARY.toLocaleString('en-US')}).`,
            code: 7011,
            details: { attemptedSalary: salary }
          });
        }

        // Format salary as string with 2 decimal places to match DB decimal(14,2)
        const salaryString = parsedSalary.toFixed(2);

        const salaryPayload = {
          user_id: String(userId),
          salary: salaryString,
          allowance_type_ids: allowance_type_ids || [],
        };

        console.log('Creating salary profile:', salaryPayload);

        const salaryResponse = await axios.post(
          `${SALARY_SERVICE_URL}/contracts/${contract.id}/salary-profile`,
          salaryPayload
        );

        console.log('Salary profile created successfully:', salaryResponse.data);
      } catch (salaryError: any) {
        console.error('Error creating salary profile:', salaryError.response?.data || salaryError.message);
        
        // Rollback contract if salary creation fails
        try {
          await ContractModel.query().deleteById(contract.id);
          console.log('Contract rollback successful after salary error');
        } catch (rollbackErr) {
          console.error('Contract rollback failed:', rollbackErr);
        }
        
        return res.status(400).json({ 
          error: 'Tạo hồ sơ lương thất bại: ' + (salaryError.response?.data?.error || salaryError.message),
          code: 7002,
          details: { stage: 'salary', rolledBackContractId: contract.id }
        });
      }
    }

    console.log('=== CREATE CONTRACT END ===');
    return res.status(201).json(contract);
  } catch (error) {
    if (error instanceof ValidationException) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    console.error('Error creating contract:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ', code: 500 });
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
      return res.status(400).json({ error: 'Thiếu ID người dùng' });
    }

    // Find contract where activeDay <= date and (endDate is null or endDate >= date)
    const contract = await ContractModel.query()
      .where('userId', userId)
      .where('activeDay', '<=', date)
      .where(function () {
        this.whereNull('endDate').orWhere('endDate', '>=', date);
      })
      .withGraphFetched('contractType')
      .orderBy('activeDay', 'desc')
      .first();

    if (!contract) {
      return res.status(404).json({ error: 'Không tìm thấy hợp đồng đang hoạt động cho người dùng này' });
    }

    return res.status(200).json(contract);
  } catch (error) {
    console.error('Error fetching active contract:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * Get contracts by user id
 */
export const getContractsByUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu ID người dùng' });
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
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * Delete all contracts for a user
 */
export const deleteContractsByUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu ID người dùng' });
    }
    await ContractModel.query().delete().where('userId', userId);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error('Error deleting contracts by user:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
};


