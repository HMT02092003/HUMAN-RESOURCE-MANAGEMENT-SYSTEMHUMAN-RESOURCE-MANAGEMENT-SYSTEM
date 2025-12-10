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
    const page = Math.max(1, Number(req.query.page) || Number(DEFAULT_PAGE));
    const pageSize = Math.max(1, Number(req.query.pageSize) || Number(DEFAULT_PAGE_SIZE));

    const result = await AllowanceType.query().page(page - 1, pageSize);
    res.json({ data: result.results || result, total: result.total });
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
