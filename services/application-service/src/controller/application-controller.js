import dayjs from 'dayjs';
import { ApplicationService } from '../services/ApplicationService.js';
import { ApplicationType, ApplicationStatus } from '../Models/ApplicationModel.js';

export class ApplicationController {
  /**
   * Tạo đơn từ mới
   * POST /applications
   */
  static async create(req, res) {
    try {
      const { type, data, note } = req.body;
      const userId = req.user?.id; // Assuming user info is available in req.user

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const application = await ApplicationService.createApplication({
        type,
        data,
        userId,
        note
      });

      res.status(201).json({
        success: true,
        message: 'Tạo đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách tất cả đơn từ (cho admin/manager)
   * GET /applications
   */
  static async getAll(req, res) {
    try {
      const { status, type, userId, startDate, endDate } = req.query;

      let applications;

      if (startDate && endDate) {
        applications = await ApplicationService.getApplicationsByDateRange(
          startDate, endDate, userId ? parseInt(userId) : null
        );
      } else if (type) {
        applications = await ApplicationService.getApplicationsByType(
          type, userId ? parseInt(userId) : null, status ? parseInt(status) : null
        );
      } else if (status === 'pending') {
        applications = await ApplicationService.getPendingApplications(type);
      } else {
        applications = await ApplicationService.getUserApplications(
          userId ? parseInt(userId) : null, status ? parseInt(status) : null
        );
      }

      res.json({
        success: true,
        data: applications,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách đơn của user hiện tại
   * GET /applications/my-applications
   */
  static async getMyApplications(req, res) {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const applications = await ApplicationService.getUserApplications(
        userId, status ? parseInt(status) : null
      );

      res.json({
        success: true,
        data: applications,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy danh sách đơn cần duyệt
   * GET /applications/pending
   */
  static async getPendingApplications(req, res) {
    try {
      const { type } = req.query;
      const applications = await ApplicationService.getPendingApplications(type);

      res.json({
        success: true,
        data: applications,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy chi tiết đơn từ
   * GET /applications/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const application = await ApplicationService.getApplicationById(parseInt(id));

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn từ'
        });
      }

      res.json({
        success: true,
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy chi tiết đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Cập nhật đơn từ
   * PUT /applications/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { data } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const application = await ApplicationService.updateApplication(
        parseInt(id), userId, data
      );

      res.json({
        success: true,
        message: 'Cập nhật đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Hủy/Xóa đơn từ
   * DELETE /applications/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      await ApplicationService.cancelApplication(parseInt(id), userId);

      res.json({
        success: true,
        message: 'Hủy đơn từ thành công',
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi hủy đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Duyệt đơn từ
   * POST /applications/:id/approve
   */
  static async approve(req, res) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const approvedBy = req.user?.id;

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Người duyệt không được xác thực'
        });
      }

      const application = await ApplicationService.approveApplication(
        parseInt(id), approvedBy, note
      );

      res.json({
        success: true,
        message: 'Duyệt đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi duyệt đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Từ chối đơn từ
   * POST /applications/:id/reject
   */
  static async reject(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const approvedBy = req.user?.id;

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: 'Người duyệt không được xác thực'
        });
      }

      const application = await ApplicationService.rejectApplication(
        parseInt(id), approvedBy, rejectionReason
      );

      res.json({
        success: true,
        message: 'Từ chối đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi từ chối đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy thống kê đơn từ
   * GET /applications/stats
   */
  static async getStats(req, res) {
    try {
      const { userId } = req.query;
      const currentUserId = req.user?.id;

      let targetUserId = null;
      if (userId) {
        targetUserId = parseInt(userId);
      } else if (currentUserId) {
        targetUserId = currentUserId;
      }

      const stats = await ApplicationService.getApplicationStats(targetUserId);

      res.json({
        success: true,
        data: stats,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy thống kê',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Lấy đơn từ theo khoảng thời gian
   * GET /applications/date-range
   */
  static async getByDateRange(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp khoảng thời gian'
        });
      }

      const applications = await ApplicationService.getApplicationsByDateRange(
        startDate, endDate, userId ? parseInt(userId) : null
      );

      res.json({
        success: true,
        data: applications,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách đơn từ',
        timestamp: dayjs().format()
      });
    }
  }
}
