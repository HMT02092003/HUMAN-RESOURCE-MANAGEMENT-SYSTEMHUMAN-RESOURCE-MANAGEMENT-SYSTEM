import { Model } from 'objection';

// Enum cho các loại đơn từ
export const ApplicationType = {
  BUSINESS_TRIP: 'business-trip',
  LEAVE: 'leave',
  OVERTIME: 'overtime',
  REMOTE_WORK: 'remote-work',
  SICK_LEAVE: 'sick-leave'
};

// Enum cho trạng thái đơn
export const ApplicationStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2
};

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
    return {
      [ApplicationStatus.PENDING]: 'Chờ duyệt',
      [ApplicationStatus.APPROVED]: 'Đã duyệt',
      [ApplicationStatus.REJECTED]: 'Bị từ chối'
    };
  }

  static get typeNames() {
    return {
      [ApplicationType.BUSINESS_TRIP]: 'Đơn công tác',
      [ApplicationType.LEAVE]: 'Đơn nghỉ phép',
      [ApplicationType.OVERTIME]: 'Đơn làm thêm',
      [ApplicationType.REMOTE_WORK]: 'Đơn làm việc từ xa',
      [ApplicationType.SICK_LEAVE]: 'Đơn nghỉ ốm'
    };
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

  // Validate dữ liệu dựa theo loại đơn
  static validateApplicationData(type, data) {
    switch (type) {
      case ApplicationType.BUSINESS_TRIP:
        return this.validateBusinessTripData(data);
      case ApplicationType.LEAVE:
      case ApplicationType.SICK_LEAVE:
        return this.validateLeaveData(data);
      case ApplicationType.OVERTIME:
        return this.validateOvertimeData(data);
      case ApplicationType.REMOTE_WORK:
        return this.validateRemoteWorkData(data);
      default:
        return false;
    }
  }

  static validateBusinessTripData(data) {
    return !!(data.startDate && data.endDate && data.destination && data.purpose);
  }

  static validateLeaveData(data) {
    return !!(data.startDate && data.endDate && data.leaveType && data.reason);
  }

  static validateOvertimeData(data) {
    return !!(data.date && data.startTime && data.endTime && data.reason);
  }

  static validateRemoteWorkData(data) {
    return !!(data.startDate && data.endDate && data.reason && data.workLocation);
  }

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
    if (!this.applicationDate) {
      this.applicationDate = new Date().toISOString();
    }
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}
