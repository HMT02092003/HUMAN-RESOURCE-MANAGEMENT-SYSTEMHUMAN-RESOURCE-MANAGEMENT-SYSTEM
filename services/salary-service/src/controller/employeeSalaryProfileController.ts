import { Request, Response, NextFunction } from 'express';
import EmployeeSalaryProfile from '../Model/EmployeeSalaryProfile';
import EmployeeSalaryProfileAllowance from '../Model/EmployeeSalaryProfileAllowance';

// Get salary profile by user id - return the most recent profile
export const getByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    
    // Get the most recent salary profile for this user (ordered by created_at)
    const item = await EmployeeSalaryProfile.query()
      .withGraphFetched('[allowances.allowanceType]')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .first();
    
    if (!item) return res.status(200).json({ salary: 0, allowance: 0 });
    
    // Map stored fields to a simple response
    const payload = {
      id: item.id,
      user_id: item.user_id,
      salary: Number(item.base_salary || 0),
      allowance: 0,
      allowances: ((item as any).allowances || []).map((a: any) => ({
        id: a.id,
        allowance_type_id: a.allowance_type_id,
        allowance_type_name: a.allowanceType?.name || '',
        amount: Number(a.allowanceType?.default_amount || 0),
      })),
    };
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

// Create new salary profile (always insert, never update) - DEPRECATED, use createFromContract instead
export const upsertByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const { salary, allowance_type_ids } = req.body;

    const payload: any = {
      user_id: userId,
      base_salary: salary != null ? String(salary) : '0',
    };

    console.log('Inserting new salary profile for user', userId, payload);

    // Insert profile with allowances in a single transaction
    const result = await EmployeeSalaryProfile.transaction(async (trx) => {
      // Insert salary profile
      const profile = await EmployeeSalaryProfile.query(trx).insertAndFetch(payload);

      console.log('Profile created with ID:', profile.id, 'Type:', typeof profile.id);

      // Insert allowances if provided - use single insert query instead of loop
      if (Array.isArray(allowance_type_ids) && allowance_type_ids.length > 0) {
        const allowanceInserts = allowance_type_ids
          .filter((id: any) => id != null && !isNaN(Number(id)))
          .map((id: any) => ({
            employee_salary_profile_id: Number(profile.id), // Ensure it's a number
            allowance_type_id: Number(id)
          }));
        
        console.log('Inserting allowances:', allowanceInserts);
        
        if (allowanceInserts.length > 0) {
          await EmployeeSalaryProfileAllowance.query(trx).insert(allowanceInserts);
        }
      }

      // Fetch complete result with relations
      return await EmployeeSalaryProfile.query(trx)
        .findById(profile.id)
        .withGraphFetched('[allowances.allowanceType]');
    });

    res.json(result);
  } catch (err) {
    console.error('Error in upsertByUserId:', err);
    next(err);
  }
};

// List all salary profiles for a user (historical, current, future)
export const listByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const items = await EmployeeSalaryProfile.query()
      .withGraphFetched('[allowances.allowanceType]')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    const mapped = (items || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      contract_id: item.contract_id,
      salary: Number(item.base_salary || 0),
      allowances: (item.allowances || []).map((a: any) => ({
        id: a.id,
        allowance_type_id: a.allowance_type_id,
        allowance_type_name: a.allowanceType?.name || '',
        amount: Number(a.allowanceType?.default_amount || 0),
      })),
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
};

// Create new salary profile for a user (wrapper around upsert logic)
export const createForUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Reuse upsertByUserId insertion logic but keep it separate for clarity
    req.params.userId = String(req.params.userId);
    // Call upsertByUserId which always inserts a new record
    await upsertByUserId(req, res, next);
  } catch (err) {
    next(err);
  }
};

// Create salary profile linked to a contract
export const createFromContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contractId = Number(req.params.contractId);
    const { 
      user_id, 
      salary, 
      allowance_type_ids
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    if (!contractId || isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract_id' });
    }

    const payload: any = {
      user_id: String(user_id),
      contract_id: contractId,
      base_salary: salary != null ? String(salary) : '0',
    };

    console.log('Creating salary profile from contract:', contractId, payload);

    // Insert profile with allowances in transaction
    const result = await EmployeeSalaryProfile.transaction(async (trx) => {
      const profile = await EmployeeSalaryProfile.query(trx).insertAndFetch(payload);

      console.log('Salary profile created with ID:', profile.id, 'for contract:', contractId);

      // Insert allowances if provided
      if (Array.isArray(allowance_type_ids) && allowance_type_ids.length > 0) {
        const allowanceInserts = allowance_type_ids
          .filter((id: any) => id != null && !isNaN(Number(id)))
          .map((id: any) => ({
            employee_salary_profile_id: Number(profile.id),
            allowance_type_id: Number(id)
          }));
        
        if (allowanceInserts.length > 0) {
          await EmployeeSalaryProfileAllowance.query(trx).insert(allowanceInserts);
        }
      }

      // Return complete result with relations
      return await EmployeeSalaryProfile.query(trx)
        .findById(profile.id)
        .withGraphFetched('[allowances.allowanceType]');
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error in createFromContract:', err);
    next(err);
  }
};

export default { getByUserId, upsertByUserId };