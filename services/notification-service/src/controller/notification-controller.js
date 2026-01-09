import dayjs from 'dayjs';

export class NotificationController {
  static async getAll(req, res) {
    try {
      res.json({ success: true, data: [], timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      res.json({ success: true, data: { id }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const data = req.body;
      res.status(201).json({ success: true, data, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      res.json({ success: true, data: { id, ...data }, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      res.json({ success: true, message: `Deleted ${id}`, timestamp: dayjs().format() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
