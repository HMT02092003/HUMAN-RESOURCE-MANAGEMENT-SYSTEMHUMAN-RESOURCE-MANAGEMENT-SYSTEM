import { ApplicationModel, ApplicationType, ApplicationStatus } from '../Models/ApplicationModel.js';

export class ApplicationService {
  
  /**
   * Tạo đơn từ mới
   */
  static async createApplication({ type, data, userId, note }) {
    // Validate dữ liệu dựa theo loại đơn
    if (!ApplicationModel.validateApplicationData(type, data)) {
      throw new Error(`Dữ liệu đơn ${type} không hợp lệ`);
    }

    // Kiểm tra đơn trùng lặp cho một số loại đơn
    await this.checkDuplicateApplication(type, data, userId);

    const insertData = {
      type,
      data,
      userId,
      status: ApplicationStatus.PENDING,
      applicationDate: new Date().toISOString()
    };

    if (note) {
      insertData.note = note;
    }

    const application = await ApplicationModel.query().insert(insertData);
    return application;
  }

  /**
   * Lấy danh sách đơn của user
   */
  static async getUserApplications(userId, status = null) {
    return await ApplicationModel.getByUser(userId, status);
  }

  /**
   * Lấy danh sách đơn cần duyệt
   */
  static async getPendingApplications(type = null) {
    return await ApplicationModel.getPendingApplications(type);
  }

  /**
   * Lấy chi tiết đơn theo ID
   */
  static async getApplicationById(id) {
    return await ApplicationModel.query().findById(id);
  }

  /**
   * Duyệt đơn
   */
  static async approveApplication(id, approvedBy, note = null) {
    const application = await ApplicationModel.query().findById(id);
    if (!application) {
      throw new Error('Không tìm thấy đơn từ');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error('Đơn từ đã được xử lý rồi');
    }

    return await application.approve(approvedBy, note);
  }

  /**
   * Từ chối đơn
   */
  static async rejectApplication(id, approvedBy, rejectionReason) {
    const application = await ApplicationModel.query().findById(id);
    if (!application) {
      throw new Error('Không tìm thấy đơn từ');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error('Đơn từ đã được xử lý rồi');
    }

    if (!rejectionReason) {
      throw new Error('Vui lòng nhập lý do từ chối');
    }

    return await application.reject(approvedBy, rejectionReason);
  }

  /**
   * Cập nhật đơn (chỉ cho phép khi status = PENDING)
   */
  static async updateApplication(id, userId, data) {
    const application = await ApplicationModel.query().findById(id);
    
    if (!application) {
      throw new Error('Không tìm thấy đơn từ');
    }

    if (application.userId !== userId) {
      throw new Error('Bạn không có quyền sửa đơn này');
    }

    if (!application.canEdit) {
      throw new Error('Đơn từ này không thể chỉnh sửa');
    }

    // Validate dữ liệu
    if (!ApplicationModel.validateApplicationData(application.type, data)) {
      throw new Error(`Dữ liệu đơn ${application.type} không hợp lệ`);
    }

    return await application.$query().patchAndFetch({
      data,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Hủy đơn (chỉ cho phép khi status = PENDING)
   */
  static async cancelApplication(id, userId) {
    const application = await ApplicationModel.query().findById(id);
    
    if (!application) {
      throw new Error('Không tìm thấy đơn từ');
    }

    if (application.userId !== userId) {
      throw new Error('Bạn không có quyền hủy đơn này');
    }

    if (!application.canCancel) {
      throw new Error('Đơn từ này không thể hủy');
    }

    await ApplicationModel.query().deleteById(id);
  }

  /**
   * Thống kê đơn từ
   */
  static async getApplicationStats(userId = null) {
    let query = ApplicationModel.query();
    
    if (userId) {
      query = query.where('userId', userId);
    }

    const [totalApplications, pendingApplications, approvedApplications, rejectedApplications] = await Promise.all([
      query.clone().resultSize(),
      query.clone().where('status', ApplicationStatus.PENDING).resultSize(),
      query.clone().where('status', ApplicationStatus.APPROVED).resultSize(),
      query.clone().where('status', ApplicationStatus.REJECTED).resultSize()
    ]);

    return {
      total: totalApplications,
      pending: pendingApplications,
      approved: approvedApplications,
      rejected: rejectedApplications
    };
  }

  /**
   * Kiểm tra đơn trùng lặp
   */
  static async checkDuplicateApplication(type, data, userId) {
    // Kiểm tra trùng lặp cho đơn công tác
    if (type === ApplicationType.BUSINESS_TRIP) {
      const existingApplication = await ApplicationModel.query()
        .where('userId', userId)
        .where('type', ApplicationType.BUSINESS_TRIP)
        .where('status', ApplicationStatus.PENDING)
        .whereRaw(`data->>'startDate' <= ? AND data->>'endDate' >= ?`, [
          data.endDate,
          data.startDate
        ])
        .first();

      if (existingApplication) {
        throw new Error('Bạn đã có đơn công tác trong khoảng thời gian này');
      }
    }

    // Kiểm tra trùng lặp cho đơn nghỉ phép
    if (type === ApplicationType.LEAVE || type === ApplicationType.SICK_LEAVE) {
      const existingApplication = await ApplicationModel.query()
        .where('userId', userId)
        .whereIn('type', [ApplicationType.LEAVE, ApplicationType.SICK_LEAVE])
        .where('status', ApplicationStatus.PENDING)
        .whereRaw(`data->>'startDate' <= ? AND data->>'endDate' >= ?`, [
          data.endDate,
          data.startDate
        ])
        .first();

      if (existingApplication) {
        throw new Error('Bạn đã có đơn nghỉ trong khoảng thời gian này');
      }
    }
  }

  /**
   * Lấy đơn theo khoảng thời gian
   */
  static async getApplicationsByDateRange(startDate, endDate, userId = null) {
    let query = ApplicationModel.query()
      .where('applicationDate', '>=', startDate)
      .where('applicationDate', '<=', endDate);
      
    if (userId) {
      query = query.where('userId', userId);
    }

    return await query.orderBy('applicationDate', 'desc');
  }

  /**
   * Lấy đơn theo loại
   */
  static async getApplicationsByType(type, userId = null, status = null) {
    let query = ApplicationModel.query().where('type', type);
    
    if (userId) {
      query = query.where('userId', userId);
    }
    
    if (status !== null) {
      query = query.where('status', status);
    }
    
    return await query.orderBy('applicationDate', 'desc');
  }
}
