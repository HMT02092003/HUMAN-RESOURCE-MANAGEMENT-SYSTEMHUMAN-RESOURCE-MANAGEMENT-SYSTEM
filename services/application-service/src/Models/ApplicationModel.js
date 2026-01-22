import { Model } from 'objection';
import { ApplicationType, ApplicationStatus, APPLICATION_TYPE_LABELS, APPLICATION_STATUS_LABELS } from '../config/application-constants.js';
import { validate } from '../utils/validation-utility.js';
import dayjs from 'dayjs';
import { applySearch, applyFilters, applySorting, applyPagination } from '../utils/query-builder.js';

export class ApplicationModel extends Model {
  static get tableName() {
    return 'applications';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['type', 'data', 'userId'],
      properties: {
        id: { type: 'integer' },
        type: {
          type: 'string',
          enum: Object.values(ApplicationType)
        },
        status: {
          type: 'integer',
          enum: Object.values(ApplicationStatus),
          default: ApplicationStatus.PENDING
        },
        data: { type: 'object' },
        userId: { type: 'integer' },
        approvedBy: { type: ['integer', 'null'] },
        applicationDate: { type: 'string', format: 'date-time' },
        approvedDate: { type: ['string', 'null'], format: 'date-time' },
        reason: { type: ['string', 'null'] },
        rejectionReason: { type: ['string', 'null'] },
        note: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  // Các phương thức helper
  static get statusNames() {
    return APPLICATION_STATUS_LABELS;
  }

  static get typeNames() {
    return APPLICATION_TYPE_LABELS;
  }

  // Getter để lấy tên trạng thái
  get statusName() {
    return ApplicationModel.statusNames[this.status] || 'Không xác định';
  }

  // Getter để lấy tên loại đơn
  get typeName() {
    return ApplicationModel.typeNames[this.type] || 'Không xác định';
  }

  // Kiểm tra xem đơn có thể được chỉnh sửa không
  get canEdit() {
    return this.status === ApplicationStatus.PENDING;
  }

  // Kiểm tra xem đơn có thể được hủy không
  get canCancel() {
    return this.status === ApplicationStatus.PENDING;
  }

  // Phương thức approve đơn
  async approve(approvedBy, note = null) {
    const updateData = {
      status: ApplicationStatus.APPROVED,
      approvedBy,
      approvedDate: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (note) {
      updateData.note = note;
    }

    return await this.$query().patchAndFetch(updateData);
  }

  // Phương thức reject đơn
  async reject(approvedBy, rejectionReason) {
    return await this.$query().patchAndFetch({
      status: ApplicationStatus.REJECTED,
      approvedBy,
      rejectionReason,
      approvedDate: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Query để lấy các đơn theo user
  static async getByUser(userId, status = null) {
    let query = this.query().where('userId', userId);

    if (status !== null) {
      query = query.where('status', status);
    }

    return query.orderBy('applicationDate', 'desc');
  }

  // Query để lấy các đơn cần duyệt
  static async getPendingApplications(type = null) {
    let query = this.query().where('status', ApplicationStatus.PENDING);

    if (type) {
      query = query.where('type', type);
    }

    return query.orderBy('applicationDate', 'asc');
  }

  // === Thêm các phương thức xử lý logic từ Service ===

  /**
   * Tạo đơn từ mới với đầy đủ validation và logic
   */
  static async createApplication({ type, data, userId }) {
    // Validate inputs
    const inputs = { type, data, userId };
    const allowFields = {
      type: "string!",
      data: "object!",
      userId: "number!",
    };

    const validatedData = validate(inputs, allowFields, { removeNotAllow: true });

    // Kiểm tra đơn trùng lặp
    await this.checkDuplicateApplication(validatedData.type, validatedData.data, validatedData.userId);

    const insertData = {
      ...validatedData,
      userId: validatedData.userId,
      status: ApplicationStatus.PENDING,
    };

    const application = await this.query().insert(insertData);
    return application;
  }

  /**
   * Lấy danh sách đơn của user với pagination
   */
  static async getUserApplicationsPaginated(userId, status = null, type = null, offset = 0, limit = 10) {
    let query = this.query().where('userId', userId);

    if (status !== null) {
      query = query.where('status', status);
    }

    if (type) {
      query = query.where('type', type);
    }

    return query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit);
  }

  /**
   * Đếm tổng số đơn của user
   */
  static async getUserApplicationsCount(userId, status = null, type = null) {
    let query = this.query().where('userId', userId);

    if (status !== null) {
      query = query.where('status', status);
    }

    if (type) {
      query = query.where('type', type);
    }

    return query.resultSize();
  }

  /**
   * Lấy danh sách đơn của user với filters
   */
  static async getUserApplications(userId, status = null, type = null) {
    let query = this.query().where('userId', userId);

    if (status !== null) {
      query = query.where('status', status);
    }

    if (type) {
      query = query.where('type', type);
    }

    return query.orderBy('applicationDate', 'desc');
  }

  /**
   * Lấy tất cả đơn với filters cho admin - có pagination
   */
  static async getAllApplicationsPaginated(filters = {}, offset = 0, limit = 10) {
    const { allowedUserIds, userId } = filters;
    let query = this.query();

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    return query
      .orderBy('created_at', 'desc')
      .modify((builder) => {
        if (userId) builder.whereNot("userId", userId).skipUndefined();
      })
      .offset(offset)
      .limit(limit);
  }

  /**
   * Đếm tổng số đơn với filters
   */
  static async getAllApplicationsCount(filters = {}) {
    const { status, type, userId, startDate, endDate, allowedUserIds } = filters;
    let query = this.query();

    if (status !== undefined && status !== null) {
      query = query.where('status', status);
    }

    if (type) {
      query = query.where('type', type);
    }

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    // Loại bỏ đơn của chính mình (giống logic trong getAllApplicationsPaginated)
    if (userId) {
      query = query.whereNot('userId', userId).skipUndefined();
    } else {
      query = query.skipUndefined();
    }

    if (startDate && endDate) {
      query = query.whereBetween('applicationDate', [startDate, endDate]);
    }

    return query.resultSize();
  }

  /**
   * Lấy các đơn cần duyệt - có pagination
   */
  static async getPendingApplicationsPaginated(type = null, offset = 0, limit = 10, allowedUserIds = null) {
    let query = this.query().where('status', ApplicationStatus.PENDING);

    if (type) {
      query = query.where('type', type);
    }

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    return query
      .orderBy('created_at', 'asc')
      .offset(offset)
      .limit(limit);
  }

  /**
   * Đếm số đơn cần duyệt
   */
  static async getPendingApplicationsCount(type = null, allowedUserIds = null) {
    let query = this.query().where('status', ApplicationStatus.PENDING);

    if (type) {
      query = query.where('type', type);
    }

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    return query.resultSize();
  }

  /**
   * Lấy đơn theo loại - có pagination
   */
  static async getApplicationsByTypePaginated(type, userId = null, status = null, offset = 0, limit = 10, allowedUserIds = null) {
    let query = this.query().where('type', type);

    if (userId) {
      query = query.where('userId', userId);
    }

    if (status !== null) {
      query = query.where('status', status);
    }

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    return query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit);
  }

  /**
   * Đếm số đơn theo loại
   */
  static async getApplicationsByTypeCount(type, userId = null, status = null, allowedUserIds = null) {
    let query = this.query().where('type', type);

    if (userId) {
      query = query.where('userId', userId);
    }

    if (status !== null) {
      query = query.where('status', status);
    }

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    return query.resultSize();
  }

  /**
   * Lấy đơn theo khoảng thời gian - có pagination
   */
  static async getApplicationsByDateRangePaginated(startDate, endDate, userId = null, status = null, offset = 0, limit = 10, allowedUserIds = null) {
    let query = this.query()
      .where('applicationDate', '>=', startDate)
      .where('applicationDate', '<=', endDate);

    if (userId) {
      query = query.where('userId', userId);
    }

    if (status !== null) {
      query = query.where('status', status);
    }

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    return query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit);
  }

  /**
   * Đếm số đơn theo khoảng thời gian
   */
  static async getApplicationsByDateRangeCount(startDate, endDate, userId = null, status = null, allowedUserIds = null) {
    let query = this.query()
      .where('applicationDate', '>=', startDate)
      .where('applicationDate', '<=', endDate);

    if (userId) {
      query = query.where('userId', userId);
    }

    if (status !== null) {
      query = query.where('status', status);
    }

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    return query.resultSize();
  }

  /**
   * Lấy tất cả đơn với filters cho admin
   */
  static async getAllApplications(filters = {}) {
    const { status, type, userId, startDate, endDate } = filters;
    let query = this.query();

    if (status !== undefined && status !== null) {
      query = query.where('status', status);
    }

    if (type) {
      query = query.where('type', type);
    }

    if (userId) {
      query = query.where('userId', userId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('applicationDate', [startDate, endDate]);
    }

    return query.orderBy('applicationDate', 'desc');
  }

  /**
   * Lấy chi tiết đơn theo ID
   */
  static async getApplicationById(id) {
    const application = await this.query().findById(id);
    if (!application) {
      throw new Error('Không tìm thấy đơn từ');
    }
    return application;
  }

  /**
   * Duyệt đơn
   */
  static async approveApplication(id, approvedBy, note = null) {
    const application = await this.getApplicationById(id);

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error('Đơn từ này đã được xử lý');
    }

    return await application.approve(approvedBy, note);
  }

  /**
   * Từ chối đơn
   */
  static async rejectApplication(id, approvedBy, rejectionReason) {
    const application = await this.getApplicationById(id);

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error('Đơn từ này đã được xử lý');
    }

    return await application.reject(approvedBy, rejectionReason || 'Không có lý do cụ thể');
  }

  /**
   * Cập nhật đơn từ (chỉ cho phép khi status = PENDING)
   */
  static async updateApplication(id, userId, data) {
    const application = await this.getApplicationById(id);

    if (application.userId !== userId) {
      throw new Error('Bạn không có quyền chỉnh sửa đơn này');
    }

    if (!application.canEdit) {
      throw new Error('Đơn từ này không thể chỉnh sửa');
    }

    return await application.$query().patchAndFetch({
      data,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Hủy đơn (xóa đơn khi status = PENDING)
   */
  static async cancelApplication(id, userId) {
    const application = await this.getApplicationById(id);

    if (application.userId !== userId) {
      throw new Error('Bạn không có quyền hủy đơn này');
    }

    if (!application.canCancel) {
      throw new Error('Đơn từ này không thể hủy');
    }

    await this.query().deleteById(id);
    return { message: 'Hủy đơn thành công' };
  }

  /**
   * Thống kê đơn từ
   */
  static async getApplicationStats(userId = null, filters = {}) {
    let baseQuery = this.query();

    if (userId) {
      baseQuery = baseQuery.where('userId', userId);
    }

    // Apply additional filters
    const { startDate, endDate, type } = filters;
    if (startDate && endDate) {
      baseQuery = baseQuery.whereBetween('applicationDate', [startDate, endDate]);
    }
    if (type) {
      baseQuery = baseQuery.where('type', type);
    }

    const [totalApplications, pendingApplications, approvedApplications, rejectedApplications] = await Promise.all([
      baseQuery.clone().resultSize(),
      baseQuery.clone().where('status', ApplicationStatus.PENDING).resultSize(),
      baseQuery.clone().where('status', ApplicationStatus.APPROVED).resultSize(),
      baseQuery.clone().where('status', ApplicationStatus.REJECTED).resultSize()
    ]);

    return {
      total: totalApplications,
      pending: pendingApplications,
      approved: approvedApplications,
      rejected: rejectedApplications
    };
  }

  /**
   * Lấy đơn theo khoảng thời gian
   */
  static async getApplicationsByDateRange(startDate, endDate, userId = null, status = null) {
    let query = this.query()
      .where('applicationDate', '>=', startDate)
      .where('applicationDate', '<=', endDate);

    if (userId) {
      query = query.where('userId', userId);
    }

    if (status !== null) {
      query = query.where('status', status);
    }

    return await query.orderBy('applicationDate', 'desc');
  }

  /**
   * Lấy đơn theo loại
   */
  static async getApplicationsByType(type, userId = null, status = null) {
    let query = this.query().where('type', type);

    if (userId) {
      query = query.where('userId', userId);
    }

    if (status !== null) {
      query = query.where('status', status);
    }

    return await query.orderBy('applicationDate', 'desc');
  }

  /**
   * Kiểm tra đơn trùng lặp
   */
  static async checkDuplicateApplication(type, data, userId) {
    // Kiểm tra trùng lặp cho đơn công tác
    if (type === ApplicationType.BUSINESS_TRIP) {
      const existingApplication = await this.query()
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
      console.log('Checking duplicate leave application for user:', userId, 'from', data.startDate, 'to', data.endDate);
      const existingApplication = await this.query()
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
   * Kiểm tra số lượng đơn quên chấm công trong tháng
   * Giới hạn tối đa 2 đơn đã được duyệt/tháng
   */
  static async checkRequiredApplication(userId) {
    const application = await ApplicationModel.query()
      .where('userId', userId)
      .where('type', "forgot-check")
      .where('status', ApplicationStatus.APPROVED)
      .whereBetween('created_at', [
        dayjs().startOf('month').toISOString(),
        dayjs().endOf('month').toISOString()
      ]);

    console.log(`✅ Checking forgot-check applications for user ${userId} in current month:`, application.length);

    // Kiểm tra nếu đã có 2 đơn được duyệt trong tháng
    if (application.length >= 2) {
      throw new Error('Bạn đã hết lượt tạo đơn quên chấm công trong tháng này (tối đa 2 đơn/tháng)');
    }
  }

  /**
   * Lấy tất cả đơn với filters, search, sort cho admin - có pagination
   * Sử dụng query-builder để giảm code trùng lặp
   * @param {Object} filters - { allowedUserIds, userId, type, status, search, createdAtFrom, createdAtTo, sortField, sortOrder }
   * @param {number} offset
   * @param {number} limit
   */
  static async getAllApplicationsPaginatedWithSort(filters = {}, offset = 0, limit = 10) {
    const {
      allowedUserIds,
      userId,
      type,
      status,
      search,
      createdAtFrom,
      createdAtTo,
      approvedDateFrom,
      approvedDateTo,
      sortField = 'created_at',
      sortOrder = 'desc'
    } = filters;

    // Field mapping cho sort và filter
    const fieldMapping = {
      createdAt: 'created_at',
      created_at: 'created_at',
      approvedDate: 'approvedDate',
      // Frontend may request sorting by nested user info keys (e.g. approvedByInfo.fullName)
      // Map those to real DB columns (approvedBy is a user id column)
      'approvedByInfo.fullName': 'approvedBy',
      'approvedByInfo': 'approvedBy',
      // Allow sorting by creator's full name key if frontend uses userInfo.fullName
      'userInfo.fullName': 'userId',
      'userInfo': 'userId',
      'userInfo.department.name': 'userId',
      'userInfo.department': 'userId'
    };

    // Build base query
    let query = this.query();

    // Filter theo allowedUserIds (scope permission) - đặc biệt, không dùng query-builder
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    // Loại bỏ đơn của chính mình
    if (userId) {
      query = query.whereNot('userId', userId).skipUndefined();
    }

    // Sử dụng query-builder cho filters thông thường
    const filterParams = {};
    if (type) filterParams.type = type;
    if (status !== null && status !== undefined) filterParams.status = status;
    if (createdAtFrom) filterParams.createdAtFrom = createdAtFrom;
    if (createdAtTo) filterParams.createdAtTo = createdAtTo;
    if (approvedDateFrom) filterParams.approvedDateFrom = approvedDateFrom;
    if (approvedDateTo) filterParams.approvedDateTo = approvedDateTo;

    // Apply filters
    query = applyFilters(query, filterParams, { createdAt: 'created_at' });

    // Apply sorting
    query = applySorting(query, sortField, sortOrder, fieldMapping, { field: 'created_at', order: 'desc' });

    // Apply pagination
    return applyPagination(query, Math.floor(offset / limit) + 1, limit);
  }

  /**
   * Đếm tổng số đơn với filters đầy đủ (search, type, status, date range)
   * Sử dụng query-builder để giảm code trùng lặp
   * @param {Object} filters
   */
  static async getAllApplicationsCountWithFilters(filters = {}) {
    const {
      allowedUserIds,
      userId,
      type,
      status,
      createdAtFrom,
      createdAtTo,
      approvedDateFrom,
      approvedDateTo
    } = filters;

    // Build base query
    let query = this.query();

    // Filter theo allowedUserIds (scope permission)
    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.whereIn('userId', allowedUserIds);
    }

    // Loại bỏ đơn của chính mình
    if (userId) {
      query = query.whereNot('userId', userId).skipUndefined();
    }

    // Sử dụng query-builder cho filters
    const filterParams = {};
    if (type) filterParams.type = type;
    if (status !== null && status !== undefined) filterParams.status = status;
    if (createdAtFrom) filterParams.createdAtFrom = createdAtFrom;
    if (createdAtTo) filterParams.createdAtTo = createdAtTo;
    if (approvedDateFrom) filterParams.approvedDateFrom = approvedDateFrom;
    if (approvedDateTo) filterParams.approvedDateTo = approvedDateTo;

    // Apply filters
    query = applyFilters(query, filterParams, { createdAt: 'created_at' });

    return query.resultSize();
  }

  /**
   * Lấy danh sách đơn của user với server-side search, sort, filter và pagination
   * @param {number} userId - ID của user
   * @param {Object} filters - { search, type, status, createdAtFrom, createdAtTo, sortField, sortOrder }
   * @param {number} offset
   * @param {number} limit
   */
  static async getMyApplicationsPaginatedWithSort(userId, filters = {}, offset = 0, limit = 10) {
    const {
      search,
      type,
      status,
      createdAtFrom,
      createdAtTo,
      sortField = 'created_at',
      sortOrder = 'desc'
    } = filters;

    // Field mapping cho sort và filter
    const fieldMapping = {
      createdAt: 'created_at',
      created_at: 'created_at'
      // Note: for my-applications pagination, sorting by nested user/approver fields
      // is mapped to numeric id columns since there is no users table to join here.
      , 'approvedByInfo.fullName': 'approvedBy',
      'approvedByInfo': 'approvedBy',
      'userInfo.fullName': 'userId',
      'userInfo': 'userId',
      'userInfo.department.name': 'userId',
      'userInfo.department': 'userId'
    };

    // Searchable fields
    const searchFields = ['type', 'reason', 'note'];

    // Build base query
    let query = this.query().where('userId', userId);

    // If controller provided approvedBy filter (array of approver IDs), apply whereIn
    if (filters && filters.approvedBy && Array.isArray(filters.approvedBy) && filters.approvedBy.length > 0) {
      query = query.whereIn('approvedBy', filters.approvedBy);
    }

    // Sử dụng query-builder cho filters
    const filterParams = {};
    if (type) filterParams.type = type;
    if (status !== null && status !== undefined && status !== '') filterParams.status = parseInt(status);
    if (createdAtFrom) filterParams.createdAtFrom = createdAtFrom;
    if (createdAtTo) filterParams.createdAtTo = createdAtTo;

    // Apply filters
    query = applyFilters(query, filterParams, { createdAt: 'created_at' });

    // Apply search
    if (search && search.trim()) {
      query = applySearch(query, search, searchFields);
    }

    // Apply sorting
    query = applySorting(query, sortField, sortOrder, fieldMapping, { field: 'created_at', order: 'desc' });

    // Apply pagination
    return applyPagination(query, Math.floor(offset / limit) + 1, limit);
  }

  /**
   * Đếm tổng số đơn của user với filters
   * Sử dụng query-builder để giảm code trùng lặp
   * @param {number} userId
   * @param {Object} filters
   */
  static async getMyApplicationsCountWithFilters(userId, filters = {}) {
    const { search, type, status, createdAtFrom, createdAtTo } = filters;

    // Searchable fields
    const searchFields = ['type', 'reason', 'note'];

    // Build base query
    let query = this.query().where('userId', userId);
    if (filters && filters.approvedBy && Array.isArray(filters.approvedBy) && filters.approvedBy.length > 0) {
      query = query.whereIn('approvedBy', filters.approvedBy);
    }

    // Sử dụng query-builder cho filters
    const filterParams = {};
    if (type) filterParams.type = type;
    if (status !== null && status !== undefined && status !== '') filterParams.status = parseInt(status);
    if (createdAtFrom) filterParams.createdAtFrom = createdAtFrom;
    if (createdAtTo) filterParams.createdAtTo = createdAtTo;

    // Apply filters
    query = applyFilters(query, filterParams, { createdAt: 'created_at' });

    // Apply search
    if (search && search.trim()) {
      query = applySearch(query, search, searchFields);
    }

    return query.resultSize();
  }

  /**
   * Lấy tất cả đơn của user (không phân trang) - dùng cho select/dropdown
   * @param {number} userId
   */
  static async getAllMyApplicationsList(userId) {
    return this.query()
      .where('userId', userId)
      .orderBy('created_at', 'desc');
  }
}
