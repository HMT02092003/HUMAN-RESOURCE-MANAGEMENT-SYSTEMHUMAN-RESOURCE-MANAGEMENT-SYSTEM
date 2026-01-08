import { Model } from 'objection';
// NOTE: This model referenced legacy ShiftConfigurationModel which was removed during schema redesign.
// Keep this file as deprecated compatibility shim (no runtime relation mappings) to avoid TS import errors elsewhere.

/**
 * ShiftRegistrationModel - Quản lý đăng ký ca làm việc của nhân viên
 * Bảng: shift_registrations
 */
export class ShiftRegistrationModel extends Model {
  id!: number;
  userId!: number;
  shiftConfigId!: number;
  workDate!: string;
  status!: number;
  reason?: string;
  note?: string;
  approvedBy?: number;
  approvedDate?: string;
  rejectionReason?: string;
  created_at?: string;
  updated_at?: string;

  // Relations (legacy)
  shiftConfig?: any;

  static override get tableName() {
    return 'shift_registrations';
  }

  static override get idColumn() {
    return 'id';
  }

  /**
   * Enum cho trạng thái đăng ký
   */
  static get STATUS() {
    return {
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 2,
      CANCELLED: 3
    };
  }

  static get STATUS_LABELS(): Record<number, string> {
    return {
      0: 'Chờ duyệt',
      1: 'Đã duyệt',
      2: 'Từ chối',
      3: 'Đã hủy'
    };
  }

  static override get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'shiftConfigId', 'workDate'],
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        shiftConfigId: { type: 'integer' },
        workDate: { type: 'string', format: 'date' },
        status: { type: 'integer', enum: [0, 1, 2, 3] },
        reason: { type: 'string', maxLength: 500 },
        note: { type: 'string', maxLength: 500 },
        approvedBy: { type: ['integer', 'null'] },
        approvedDate: { type: ['string', 'null'] },
        rejectionReason: { type: ['string', 'null'], maxLength: 500 },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
      }
    };
  }

  // Relations removed: legacy relation to shift_configurations deleted during migration.
  // Use manual joins in services if needed, or the new EmployeeScheduleModel/ShiftModel.

  /**
   * Get status label
   */
  get statusLabel(): string {
    return ShiftRegistrationModel.STATUS_LABELS[this.status] || 'Không xác định';
  }

  /**
   * Kiểm tra xem đơn có thể chỉnh sửa không
   */
  get canEdit(): boolean {
    return this.status === ShiftRegistrationModel.STATUS.PENDING;
  }

  /**
   * Kiểm tra xem đơn có thể hủy không
   */
  get canCancel(): boolean {
    return this.status === ShiftRegistrationModel.STATUS.PENDING;
  }

  /**
   * Lấy đăng ký theo userId và filters
   */
  static async getByUser(
    userId: number,
    filters?: {
      status?: number;
      fromDate?: string;
      toDate?: string;
      shiftConfigId?: number;
    }
  ) {
    let query = this.query()
      .where('userId', userId)
      .withGraphFetched('shiftConfig');

    if (filters?.status !== undefined) {
      query = query.where('status', filters.status);
    }

    if (filters?.fromDate) {
      query = query.where('workDate', '>=', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.where('workDate', '<=', filters.toDate);
    }

    if (filters?.shiftConfigId) {
      query = query.where('shiftConfigId', filters.shiftConfigId);
    }

    return query.orderBy('workDate', 'desc');
  }

  /**
   * Lấy đăng ký pending (chờ duyệt)
   */
  static async getPendingRegistrations(filters?: {
    fromDate?: string;
    toDate?: string;
    shiftConfigId?: number;
  }) {
    let query = this.query()
      .where('status', this.STATUS.PENDING)
      .withGraphFetched('shiftConfig');

    if (filters?.fromDate) {
      query = query.where('workDate', '>=', filters.fromDate);
    }

    if (filters?.toDate) {
      query = query.where('workDate', '<=', filters.toDate);
    }

    if (filters?.shiftConfigId) {
      query = query.where('shiftConfigId', filters.shiftConfigId);
    }

    return query.orderBy('workDate', 'asc');
  }

  /**
   * Kiểm tra xem user đã đăng ký ca này trong ngày chưa
   */
  static async checkDuplicate(userId: number, workDate: string, shiftConfigId: number, excludeId?: number) {
    let query = this.query()
      .where('userId', userId)
      .where('workDate', workDate)
      .where('shiftConfigId', shiftConfigId)
      .whereIn('status', [this.STATUS.PENDING, this.STATUS.APPROVED]);

    if (excludeId) {
      query = query.whereNot('id', excludeId).skipUndefined();
    } else {
      query = query.skipUndefined();
    }

    const existing = await query.first();
    return !!existing;
  }

  /**
   * Approve đăng ký
   */
  async approve(approvedBy: number, note?: string) {
    const updateData: any = {
      status: ShiftRegistrationModel.STATUS.APPROVED,
      approvedBy,
      approvedDate: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (note) {
      updateData.note = note;
    } else if (this.note) {
      updateData.note = this.note;
    }

    return this.$query().patchAndFetch(updateData);
  }

  /**
   * Reject đăng ký
   */
  async reject(approvedBy: number, rejectionReason: string) {
    return this.$query().patchAndFetch({
      status: ShiftRegistrationModel.STATUS.REJECTED,
      approvedBy,
      rejectionReason,
      approvedDate: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Cancel đăng ký
   */
  async cancel() {
    if (!this.canCancel) {
      throw new Error('Không thể hủy đăng ký này');
    }

    return this.$query().patchAndFetch({
      status: ShiftRegistrationModel.STATUS.CANCELLED,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Lấy thống kê đăng ký theo tháng
   */
  static async getMonthlyStats(userId: number, year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const registrations = await this.query()
      .where('userId', userId)
      .where('workDate', '>=', startDate)
      .where('workDate', '<=', endDate)
      .withGraphFetched('shiftConfig');

    const stats = {
      total: registrations.length,
      pending: registrations.filter(r => r.status === this.STATUS.PENDING).length,
      approved: registrations.filter(r => r.status === this.STATUS.APPROVED).length,
      rejected: registrations.filter(r => r.status === this.STATUS.REJECTED).length,
      cancelled: registrations.filter(r => r.status === this.STATUS.CANCELLED).length,
      byShift: {} as Record<string, number>
    };

    registrations.forEach(reg => {
      if (reg.shiftConfig) {
        const shiftName = reg.shiftConfig.name;
        stats.byShift[shiftName] = (stats.byShift[shiftName] || 0) + 1;
      }
    });

    return stats;
  }
}
