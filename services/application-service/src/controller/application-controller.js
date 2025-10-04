import dayjs from 'dayjs';
import { ApplicationModel } from '../Models/ApplicationModel.js';
import AuthService from '../service/AuthService.js';
import { deleteFiles } from '../middleware/upload.js';
import axios from 'axios';

// Sử dụng API Gateway thay vì gọi trực tiếp
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://127.0.0.1:4000';

export class ApplicationController {
  /**
   * Tạo đơn từ mới
   * POST /applications
   */
  static async create(req, res) {
    try {
      const { type, data } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      // Parse data nếu là string (từ FormData)
      let parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      // Xử lý file upload nếu có
      if (req.files && req.files.length > 0) {
        const evidenceFiles = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: `/applications/${file.filename}`, // Đường dẫn tương đối từ public
          size: file.size,
          mimetype: file.mimetype
        }));

        parsedData.evidence = evidenceFiles;
      }

      if (type == "forgot-check") {
         await ApplicationModel.checkRequiredApplication(userId);
      }

      const application = await ApplicationModel.createApplication({
        type,
        data: parsedData,
        userId,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo đơn từ thành công',
        data: application,
        timestamp: dayjs().format()
      });
    } catch (error) {
      // Xóa files đã upload nếu có lỗi
      if (req.files && req.files.length > 0) {
        const filenames = req.files.map(file => file.filename);
        deleteFiles(filenames);
      }

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
      // const uniqueApprovedIds = [...new Set(applications.forEach(app => {
      //   let arr = [];
      //   if (app.approvedBy != null) arr.push(app.approvedBy);
      //   return arr;
      // }))];

      let uniqueApprovedIds = [];
      applications.forEach(app => {
        if (app.approvedBy != null) uniqueApprovedIds.push(app.approvedBy);
      });

      // Gọi Auth Service để lấy thông tin users
      const usersInfo = await AuthService.getUsersByIds(uniqueUserIds);
      const approvedUsersInfo = await AuthService.getUsersByIds(uniqueApprovedIds);


      // Tạo map để dễ dàng lookup user info
      const usersMap = {};
      usersInfo.forEach(user => {
        usersMap[user.id] = {
          id: user.id,
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      });

      const approvedUsersMap = {};
      approvedUsersInfo.forEach(approve => {
        approvedUsersMap[approve.id] = {
          ...approve,
          fullName: `${approve.firstName || ''} ${approve.lastName || ''}`.trim()
        };
      });

      // Map applications với user info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        approvedByInfo: approvedUsersMap[application.approvedBy] || null,
        userInfo: usersMap[application.userId] || null
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

      // Lấy thông tin user từ Auth Service
      const usersInfo = await AuthService.getUsersByIds([userId]);

      // Lấy danh sách unique approvedBy IDs
      let uniqueApprovedIds = [];
      applications.forEach(app => {
        if (app.approvedBy != null) uniqueApprovedIds.push(app.approvedBy);
      });

      // Gọi Auth Service để lấy thông tin người duyệt
      const approvedUsersInfo = uniqueApprovedIds.length > 0
        ? await AuthService.getUsersByIds(uniqueApprovedIds)
        : [];

      let userInfo = {
        id: userId,
        username: 'Unknown',
        fullName: 'Unknown User',
        email: '',
        identificationPhoto: null
      };

      if (usersInfo && usersInfo.length > 0) {
        const user = usersInfo[0];
        userInfo = {
          id: user.id,
          username: user.username,
          fullName: `${user.lastName || ''} ${user.firstName || ''}`.trim(),
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      }

      // Tạo map để dễ dàng lookup approved user info
      const approvedUsersMap = {};
      approvedUsersInfo.forEach(approve => {
        approvedUsersMap[approve.id] = {
          id: approve.id,
          username: approve.username,
          fullName: `${approve.firstName || ''} ${approve.lastName || ''}`.trim(),
          email: approve.email,
          identificationPhoto: approve.identificationPhoto
        };
      });

      // Map applications với user info và approvedBy info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo,
        approvedByInfo: approvedUsersMap[application.approvedBy] || null
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

      // Lấy danh sách unique approvedBy IDs
      let uniqueApprovedIds = [];
      applications.forEach(app => {
        if (app.approvedBy != null) uniqueApprovedIds.push(app.approvedBy);
      });

      // Gọi Auth Service để lấy thông tin users
      const usersInfo = await AuthService.getUsersByIds(uniqueUserIds);
      const approvedUsersInfo = uniqueApprovedIds.length > 0
        ? await AuthService.getUsersByIds(uniqueApprovedIds)
        : [];

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

      // Tạo map để dễ dàng lookup approved user info
      const approvedUsersMap = {};
      approvedUsersInfo.forEach(approve => {
        approvedUsersMap[approve.id] = {
          id: approve.id,
          username: approve.username,
          fullName: `${approve.firstName || ''} ${approve.lastName || ''}`.trim(),
          email: approve.email,
          identificationPhoto: approve.identificationPhoto
        };
      });

      // Map applications với user info và approvedBy info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo: usersMap[application.userId] || {
          id: application.userId,
          username: 'Unknown',
          fullName: 'Unknown User',
          email: '',
          identificationPhoto: null
        },
        approvedByInfo: approvedUsersMap[application.approvedBy] || null
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

      // Lấy thông tin user từ Auth Service
      const usersInfo = await AuthService.getUsersByIds([application.userId]);
      const approvedUsersInfo = application.approvedBy ? await AuthService.getUsersByIds([application.approvedBy]) : [];

      let userInfo = {
        id: application.userId,
        username: 'Unknown',
        fullName: 'Unknown User',
        email: '',
        identificationPhoto: null
      };

      if (usersInfo && usersInfo.length > 0) {
        const user = usersInfo[0];
        userInfo = {
          id: user.id,
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      }

      if (approvedUsersInfo && approvedUsersInfo.length > 0) {
        const approve = approvedUsersInfo[0];
        application.approvedByInfo = {
          id: approve.id,
          username: approve.username,
          fullName: `${approve.firstName} ${approve.lastName}`.trim(),
          email: approve.email,
          identificationPhoto: approve.identificationPhoto
        };
      }

      res.json({
        success: true,
        data: {
          ...application,
          userInfo,
          approvedByInfo: application.approvedByInfo
        },
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

      // Lấy thông tin đơn trước khi approve để xử lý
      const applicationBeforeApprove = await ApplicationModel.getApplicationById(parseInt(id));

      if (!applicationBeforeApprove) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn từ'
        });
      }

      // Xử lý riêng cho đơn quên check - cập nhật bảng chấm công TRƯỚC KHI approve
      if (applicationBeforeApprove.type === 'forgot-check') {
        try {
          console.log('📝 Processing forgot-check application approval...');
          console.log('Application data:', applicationBeforeApprove.data);

          const { forgotDate, forgotTime, forgotType } = applicationBeforeApprove.data;

          if (!forgotDate || !forgotTime || !forgotType) {
            return res.status(400).json({
              success: false,
              message: 'Dữ liệu đơn quên check không đầy đủ (thiếu forgotDate, forgotTime, hoặc forgotType)'
            });
          }

          // Gọi sang attendance-service QUA API GATEWAY để cập nhật bảng chấm công
          console.log(`🌐 Calling attendance service via API Gateway: ${API_GATEWAY_URL}/api/attendance/update-forgot-check`);

          const attendanceResponse = await axios.post(
            `${API_GATEWAY_URL}/api/attendance/update-forgot-check`,
            {
              userId: applicationBeforeApprove.userId,
              forgotDate,
              forgotTime,
              forgotType
            },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 10000 // 10 seconds timeout
            }
          );

          console.log('✅ Attendance updated successfully:', attendanceResponse.data);

          // CHỈ SAU KHI cập nhật chấm công thành công, mới approve đơn
          const application = await ApplicationModel.approveApplication(
            parseInt(id), approvedBy, note
          );

          return res.json({
            success: true,
            message: 'Duyệt đơn từ và cập nhật chấm công thành công',
            data: application,
            attendanceUpdate: attendanceResponse.data,
            timestamp: dayjs().format()
          });

        } catch (attendanceError) {
          console.error('❌ Error updating attendance:', attendanceError.message);

          // Nếu lỗi khi cập nhật chấm công, KHÔNG approve đơn
          return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật chấm công: ' + attendanceError.message,
            detail: attendanceError.response?.data || attendanceError.message,
            timestamp: dayjs().format()
          });
        }
      }

      // Với các loại đơn khác, approve bình thường
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

      // rejectionReason là optional, không bắt buộc
      const application = await ApplicationModel.rejectApplication(
        parseInt(id), approvedBy, rejectionReason || null
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

      // Lấy danh sách unique user IDs từ applications
      const uniqueUserIds = [...new Set(applications.map(app => app.userId))];

      // Lấy danh sách unique approvedBy IDs
      let uniqueApprovedIds = [];
      applications.forEach(app => {
        if (app.approvedBy != null) uniqueApprovedIds.push(app.approvedBy);
      });

      // Gọi Auth Service để lấy thông tin users
      const usersInfo = await AuthService.getUsersByIds(uniqueUserIds);
      const approvedUsersInfo = uniqueApprovedIds.length > 0
        ? await AuthService.getUsersByIds(uniqueApprovedIds)
        : [];

      // Tạo map để dễ dàng lookup user info
      const usersMap = {};
      usersInfo.forEach(user => {
        usersMap[user.id] = {
          id: user.id,
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          identificationPhoto: user.identificationPhoto
        };
      });

      // Tạo map để dễ dàng lookup approved user info
      const approvedUsersMap = {};
      approvedUsersInfo.forEach(approve => {
        approvedUsersMap[approve.id] = {
          id: approve.id,
          username: approve.username,
          fullName: `${approve.firstName || ''} ${approve.lastName || ''}`.trim(),
          email: approve.email,
          identificationPhoto: approve.identificationPhoto
        };
      });

      // Map applications với user info và approvedBy info
      const applicationsWithUserInfo = applications.map(application => ({
        ...application,
        userInfo: usersMap[application.userId] || null,
        approvedByInfo: approvedUsersMap[application.approvedBy] || null
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
   * Xóa đơn từ
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

      // Lấy thông tin đơn từ để xóa files
      const application = await ApplicationModel.getApplicationById(parseInt(id));

      // Kiểm tra quyền xóa (chỉ người tạo hoặc admin mới được xóa)
      if (application.userId !== userId) {
        // TODO: Check if user is admin
        // For now, only creator can delete
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa đơn từ này'
        });
      }

      // Xóa files nếu có
      if (application.data?.evidence && Array.isArray(application.data.evidence)) {
        const { deleteFiles } = await import('../middleware/upload.js');
        deleteFiles(application.data.evidence.map(file => file.filename));
      }

      // Xóa đơn từ trong database
      await ApplicationModel.query().deleteById(parseInt(id));

      res.json({
        success: true,
        message: 'Xóa đơn từ thành công',
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(error.message.includes('Không tìm thấy') ? 404 : 500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa đơn từ',
        timestamp: dayjs().format()
      });
    }
  }

  /**
   * Xóa nhiều đơn từ
   * POST /applications/bulk-delete
   */
  static async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không được xác thực'
        });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách ID không hợp lệ'
        });
      }

      const deletedCount = [];
      const errors = [];

      for (const id of ids) {
        try {
          const application = await ApplicationModel.getApplicationById(parseInt(id));

          // Kiểm tra quyền xóa
          if (application.userId !== userId) {
            errors.push({ id, message: 'Không có quyền xóa' });
            continue;
          }

          // Xóa files nếu có
          if (application.data?.evidence && Array.isArray(application.data.evidence)) {
            const { deleteFiles } = await import('../middleware/upload.js');
            deleteFiles(application.data.evidence.map(file => file.filename));
          }

          // Xóa đơn từ
          await ApplicationModel.query().deleteById(parseInt(id));
          deletedCount.push(id);
        } catch (error) {
          errors.push({ id, message: error.message });
        }
      }

      res.json({
        success: true,
        message: `Đã xóa ${deletedCount.length}/${ids.length} đơn từ`,
        data: {
          deleted: deletedCount,
          errors: errors
        },
        timestamp: dayjs().format()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa đơn từ',
        timestamp: dayjs().format()
      });
    }
  }
}
