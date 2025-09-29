import dayjs from 'dayjs';
import { ApplicationModel } from '../Models/ApplicationModel.js';
import AuthService from '../service/AuthService.js';

export class ApplicationController {
  /**
   * Tạo đơn từ mới
   * POST /applications
   */
  static async create(req, res) {
    try {
      const { type, data, note } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const application = await ApplicationModel.createApplication({
        type,
        data,
        userId,
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
      const { page = 1, pageSize = 10 } = req.query;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      // Lấy token từ request để gọi sang Auth Service
      const token = req.cookies.token || 
                   (req.headers.authorization && req.headers.authorization.split(' ')[1]);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // Check scope quyền quản lý đơn từ từ Auth Service
      const scopeResult = await AuthService.checkUserScope('applications', token);
      console.log('DEBUG - User scope result:', scopeResult);

      // Nếu không có quyền hoặc scope không trả về userIds, chỉ trả về đơn từ của bản thân
      let allowedUserIds = [];
      if (!scopeResult.hasAccess || !scopeResult.userIds || scopeResult.userIds.length === 0) {
        allowedUserIds = [currentUserId];
        console.log('User has no scope access, showing only personal applications for user:', currentUserId);
      } else {
        allowedUserIds = scopeResult.userIds;
        console.log(`User has ${scopeResult.scope} scope access to ${allowedUserIds.length} users:`, allowedUserIds);
      }

      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      let applications;
      let totalCount;

      const filters = { 
        allowedUserIds,
        userId: currentUserId 
      };

      applications = await ApplicationModel.getAllApplicationsPaginated(filters, offset, pageSizeNum);
      totalCount = await ApplicationModel.getAllApplicationsCount(filters);

      // Lấy danh sách unique user IDs từ applications
      const uniqueUserIds = [...new Set(applications.map(app => app.userId))];
      
      // Gọi Auth Service để lấy thông tin users
      const usersInfo = await AuthService.getUsersByIds(uniqueUserIds);
      
      // Tạo map để dễ dàng lookup user info
      const usersMap = {};
      usersInfo.forEach(user => {
        usersMap[user.id] = {
          id: user.id,
          username: user.username,
          fullName: `${user.lastName || ''} ${user.firstName || ''}`.trim(),
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      });

      // Map applications với user info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo: usersMap[application.userId] || {
          id: application.userId,
          username: 'Unknown',
          fullName: 'Unknown User',
          email: '',
          identificationPhoto: null
        }
      }));

      res.json({
        success: true,
        data: applicationsWithUserInfo,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSizeNum)
        },
        total: totalCount,
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
      const { page = 1, pageSize = 10 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      const applications = await ApplicationModel.getUserApplicationsPaginated(
        userId, 
        null, // status
        null, // type
        offset,
        pageSizeNum
      );

      // Đếm tổng số record
      const totalCount = await ApplicationModel.getUserApplicationsCount(
        userId,
        null, // status
        null  // type
      );

      res.json({
        success: true,
        data: applications,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSizeNum)
        },
        total: totalCount,
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
      // Chỉ lấy page và pageSize từ query parameters
      const { page = 1, pageSize = 10 } = req.query;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      // Lấy token từ request để gọi sang Auth Service
      const token = req.cookies.token || 
                   (req.headers.authorization && req.headers.authorization.split(' ')[1]);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // Check scope quyền quản lý đơn từ từ Auth Service
      const { allowedUserIds } = await AuthService.checkUserScope(token);

      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      const applications = await ApplicationModel.getPendingApplicationsPaginated(
        null, // removed type parameter 
        offset, 
        pageSizeNum,
        allowedUserIds
      );

      const totalCount = await ApplicationModel.getPendingApplicationsCount(
        null, // removed type parameter
        allowedUserIds
      );

      // Lấy danh sách unique user IDs từ applications
      const uniqueUserIds = [...new Set(applications.map(app => app.userId))];
      
      // Gọi Auth Service để lấy thông tin users
      const usersInfo = await AuthService.getUsersByIds(uniqueUserIds);
      
      // Tạo map để dễ dàng lookup user info
      const usersMap = {};
      usersInfo.forEach(user => {
        usersMap[user.id] = {
          id: user.id,
          username: user.username,
          fullName: `${user.lastName || ''} ${user.firstName || ''}`.trim(),
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      });

      // Map applications với user info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo: usersMap[application.userId] || {
          id: application.userId,
          username: 'Unknown',
          fullName: 'Unknown User',
          email: '',
          identificationPhoto: null
        }
      }));

      res.json({
        success: true,
        data: applicationsWithUserInfo,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSizeNum)
        },
        total: totalCount,
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
      const application = await ApplicationModel.getApplicationById(parseInt(id));

      res.json({
        success: true,
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(error.message.includes('Không tìm thấy') ? 404 : 500).json({
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

      const application = await ApplicationModel.updateApplication(
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

      const result = await ApplicationModel.cancelApplication(parseInt(id), userId);

      res.json({
        success: true,
        message: result.message,
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

      const application = await ApplicationModel.approveApplication(
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

      const application = await ApplicationModel.rejectApplication(
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

      // Only aggregate by user; remove date/type filters as requested
      const stats = await ApplicationModel.getApplicationStats(targetUserId, {});

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
      // Deprecated: previous implementation filtered by date/status.
      // Now only support paginated listing by optional userId.
      const { page = 1, pageSize = 10, userId } = req.query;
      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      const filters = {
        userId: userId ? parseInt(userId) : null
      };

      const applications = await ApplicationModel.getAllApplicationsPaginated(filters, offset, pageSizeNum);
      const totalCount = await ApplicationModel.getAllApplicationsCount(filters);

      res.json({
        success: true,
        data: applications,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSizeNum)
        },
        total: totalCount,
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
