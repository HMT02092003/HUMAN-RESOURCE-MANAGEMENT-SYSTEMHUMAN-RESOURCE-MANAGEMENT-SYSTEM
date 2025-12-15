import { Request, Response, NextFunction } from 'express';
import { raw } from 'objection';
import AllowanceType from '../Model/AllowanceType';
import { validateAllowanceTypePayload } from '../ulits/validation';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../config/constant';

// simple validation schema for allowance types
const allowanceTypeSchema: any = {
  name: 'string!',
  description: 'string',
  is_taxable: 'boolean',
  default_amount: 'number'
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Frontend sends page starting from 1, convert to 0-based for ObjectionJS
    const pageFromFrontend = Math.max(1, Number(req.query.page) || 1);
    const page = pageFromFrontend - 1; // Convert to 0-based
    const pageSize = Math.max(1, Math.min(200, Number(req.query.pageSize) || Number(req.query.limit) || Number(DEFAULT_PAGE_SIZE)));
    
    // Build base query
    let query = AllowanceType.query();

    // Apply filters
    const filterableFields = ['name', 'description', 'is_taxable', 'default_amount'];
    
    for (const field of filterableFields) {
      const value = req.query[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const trimmedValue = String(value).trim();
        
        if (field === 'is_taxable') {
          // Boolean field - exact match
          const boolValue = trimmedValue === 'true' || trimmedValue === '1';
          query = query.where(field, boolValue);
        } else if (field === 'default_amount') {
          // Numeric field - exact match
          const numValue = Number(trimmedValue);
          if (!isNaN(numValue)) {
            query = query.where(field, numValue);
          }
        } else {
          // String fields - partial match (case insensitive)
          query = query.where(field, 'ilike', `%${trimmedValue}%`);
        }
      }
    }

    // Count total matching records BEFORE applying sort (to avoid ORDER BY in count query)
    const countQuery = query.clone();
    const [countResult] = await countQuery.clearOrder().count('* as count');
    const total = Number(countResult.count || 0);

    // Apply sorting
    const sortField = req.query.sort || req.query.sortField;
    const sortOrder = req.query.order || req.query.sortOrder;
    
    if (sortField && typeof sortField === 'string' && filterableFields.includes(sortField)) {
      const order = sortOrder === 'asc' || sortOrder === 'ascend' ? 'asc' : 'desc';
      query = query.orderBy(sortField, order);
    } else {
      // Default sort by id
      query = query.orderBy('id', 'asc');
    }

    // Apply pagination - ObjectionJS .page() is 0-indexed
    const result = await query.page(page, pageSize);
    
    res.json({ 
      data: result.results || result || [],
      total: total,
      pagination: {
        page: pageFromFrontend, // Return 1-based page to frontend
        pageSize: pageSize,
        total: total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Return all allowance types without pagination
export const getAllAllowanceTypesList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await AllowanceType.query().orderBy('id');
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const item = await AllowanceType.query().findById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const v = validateAllowanceTypePayload(req.body);
    if (!v.valid) return res.status(400).json({ errors: v.errors });
    const created = await AllowanceType.query().insert(v.data).returning('*');
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const v = validateAllowanceTypePayload(req.body);
    if (!v.valid) return res.status(400).json({ errors: v.errors });
    const updated = await AllowanceType.query().patchAndFetchById(id, v.data);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const removeOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const deleted = await AllowanceType.query().deleteById(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export default { list, getOne, createOne, updateOne, removeOne };
