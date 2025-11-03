import { Request, Response, RequestHandler } from 'express';
import dayjs from 'dayjs';

export class JobController {
  static getAll: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json({ success: true, data: [], timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static getById: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      res.json({ success: true, data: { id }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static create: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body;
      res.status(201).json({ success: true, data, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static update: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body;
      res.json({ success: true, data: { id, ...data }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };

  static delete: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      res.json({ success: true, message: `Deleted ${id}`, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}

export default JobController;
