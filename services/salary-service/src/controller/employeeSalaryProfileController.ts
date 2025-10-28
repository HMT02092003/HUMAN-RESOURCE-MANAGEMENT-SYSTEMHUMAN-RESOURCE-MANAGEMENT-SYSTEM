import { Request, Response, NextFunction } from 'express';
import EmployeeSalaryProfile from '../Model/EmployeeSalaryProfile';
import EmployeeSalaryProfileAllowance from '../Model/EmployeeSalaryProfileAllowance';

// Get salary profile by user id - only return the record with effective_from closest to today
export const getByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get the record with effective_from <= today, ordered by effective_from descending (most recent first)
    const item = await EmployeeSalaryProfile.query()
      .withGraphFetched('[allowances.allowanceType]')
      .where('user_id', userId)
      .where('effective_from', '<=', today)
      .orderBy('effective_from', 'desc')
      .orderBy('created_at', 'desc')
      .first();
    
    if (!item) return res.status(200).json({ salary: 0, allowance: 0 });
    
    // Map stored fields to a simple response
    const payload = {
      id: item.id,
      user_id: item.user_id,
      salary: Number(item.base_salary || 0),
      allowance: Number(item.insurance_salary || 0),
      tax_code: item.tax_code,
      bank_info: item.bank_info,
      effective_from: item.effective_from,
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

// Create new salary profile (always insert, never update)
export const upsertByUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const { salary, allowance_type_ids, bank_account, bank_name, tax_code, effective_from } = req.body;

    // Build bank_info object from separate fields
    // If incoming fields are empty strings or undefined, prefer preserving the most recent stored values
    let bank_info: any = null;
    // Fetch latest profile for this user to get previous bank_info as defaults
    const latestProfile = await EmployeeSalaryProfile.query()
      .where('user_id', userId)
      .orderBy('effective_from', 'desc')
      .first();
    const prevBankInfo = latestProfile ? latestProfile.bank_info : null;

    const hasBankAccount = bank_account !== undefined && bank_account !== null && String(bank_account).trim() !== '';
    const hasBankName = bank_name !== undefined && bank_name !== null && String(bank_name).trim() !== '';

    if (hasBankAccount || hasBankName) {
      bank_info = {
        bank_account: hasBankAccount ? String(bank_account) : (prevBankInfo ? prevBankInfo.bank_account || '' : ''),
        bank_name: hasBankName ? String(bank_name) : (prevBankInfo ? prevBankInfo.bank_name || '' : ''),
      };
    } else if (prevBankInfo) {
      // No bank fields provided in request — inherit previous bank info
      bank_info = prevBankInfo;
    }

    // Always create new record
    const effDate = effective_from 
      ? new Date(effective_from).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

  // Previously we rejected creating a profile with the same effective_from.
  // Allow inserting profiles even if a record with the same effective_from exists.
  // If duplicate handling is desired later, implement merging or versioning instead of blocking the request.

    const payload: any = {
      user_id: userId,
      base_salary: salary != null ? String(salary) : '0',
      insurance_salary: '0',
      tax_code: tax_code || null,
      bank_info: bank_info,
      effective_from: effDate,
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
      .orderBy('effective_from', 'desc')
      .orderBy('created_at', 'desc');

    const mapped = (items || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      salary: Number(item.base_salary || 0),
      allowance: Number(item.insurance_salary || 0),
      tax_code: item.tax_code,
      bank_info: item.bank_info,
      effective_from: item.effective_from,
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
export default { getByUserId, upsertByUserId };