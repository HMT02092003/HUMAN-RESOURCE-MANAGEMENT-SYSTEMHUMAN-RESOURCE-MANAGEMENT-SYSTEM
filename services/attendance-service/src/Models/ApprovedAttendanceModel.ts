import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

/**
 * Model cho bảng approved_attendances
 * Lưu thông tin TỔNG HỢP chấm công THÁNG đã được duyệt
 * - 1 user = 1 record cho 1 tháng
 * - Chi tiết từng ngày xem ở bảng time_attendances
 */
class ApprovedAttendanceModel extends Model {
    static override tableName = 'approved_attendances';

    id!: number;
    userId!: number;
    departmentId!: number;
    month!: string; // Format: YYYY-MM
    
    // ========== MONTHLY SUMMARY FIELDS ==========
    // Tổng hợp công
    totalWorkDays!: number;
    totalWorkHours!: number;
    
    // Tổng hợp đi muộn/về sớm
    totalLateDays!: number;
    totalEarlyLeaveDays!: number;
    totalLateMinutes!: number;
    totalEarlyLeaveMinutes!: number;
    
    // Tổng hợp OT
    totalOvertimeHours!: number;
    totalOvertimeDays!: number;
    totalOvertimeSalary!: number;
    
    // Tổng hợp nghỉ phép
    totalPaidLeaveDays!: number;
    totalUnpaidLeaveDays!: number;
    
    // Tổng hợp phạt
    totalLatePenalty!: number;
    totalEarlyLeavePenalty!: number;
    totalPenalty!: number;
    
    // Thông tin lương (optional)
    baseSalary!: number | null;
    totalAllowance!: number;
    finalSalary!: number | null;
    
    // ========== APPROVAL INFO ==========
    approvedBy!: number;
    approvedAt!: string;
    notes!: string | null;
    
    created_at!: string;
    updated_at!: string;

    static override get jsonSchema() {
        return {
            type: 'object',
            required: ['userId', 'departmentId', 'month', 'approvedBy'],
            properties: {
                id: { type: 'integer' },
                userId: { type: 'integer' },
                departmentId: { type: 'integer' },
                month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' }, // YYYY-MM format
                
                // Monthly summary
                totalWorkDays: { type: 'integer', default: 0 },
                totalWorkHours: { type: 'number', default: 0 },
                
                totalLateDays: { type: 'integer', default: 0 },
                totalEarlyLeaveDays: { type: 'integer', default: 0 },
                totalLateMinutes: { type: 'integer', default: 0 },
                totalEarlyLeaveMinutes: { type: 'integer', default: 0 },
                
                totalOvertimeHours: { type: 'number', default: 0 },
                totalOvertimeDays: { type: 'integer', default: 0 },
                totalOvertimeSalary: { type: 'number', default: 0 },
                
                totalPaidLeaveDays: { type: 'integer', default: 0 },
                totalUnpaidLeaveDays: { type: 'integer', default: 0 },
                
                totalLatePenalty: { type: 'number', default: 0 },
                totalEarlyLeavePenalty: { type: 'number', default: 0 },
                totalPenalty: { type: 'number', default: 0 },
                
                baseSalary: { type: ['number', 'null'] },
                totalAllowance: { type: 'number', default: 0 },
                finalSalary: { type: ['number', 'null'] },
                
                // Approval info
                approvedBy: { type: 'integer' },
                approvedAt: { type: 'string' },
                notes: { type: ['string', 'null'] },
                
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
            }
        };
    }

    static override relationMappings = {
        user: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'UserModel',
            join: {
                from: 'approved_attendances.userId',
                to: 'users.id'
            }
        },
        approver: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'UserModel',
            join: {
                from: 'approved_attendances.approvedBy',
                to: 'users.id'
            }
        },
        department: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'DepartmentModel',
            join: {
                from: 'approved_attendances.departmentId',
                to: 'departments.id'
            }
        }
    };

    // ========== HELPER METHODS ==========
    
    /**
     * Lấy thông tin duyệt công của 1 user trong 1 tháng
     */
    static async getByUserAndMonth(userId: number, month: string) {
        return this.query()
            .where('userId', userId)
            .where('month', month)
            .first();
    }

    /**
     * Lấy tất cả nhân viên đã được duyệt công trong tháng (theo phòng ban)
     */
    static async getByDepartmentAndMonth(departmentId: number, month: string) {
        return this.query()
            .where('departmentId', departmentId)
            .where('month', month)
            .withGraphFetched('user')
            .orderBy('userId');
    }

    /**
     * Kiểm tra xem tháng này của user đã được duyệt chưa
     */
    static async isApproved(userId: number, month: string): Promise<boolean> {
        const record = await this.query()
            .where('userId', userId)
            .where('month', month)
            .first();
        return !!record;
    }

    /**
     * Lấy tổng hợp công tháng (nếu đã duyệt)
     */
    static async getMonthlySummary(userId: number, month: string) {
        return this.query()
            .where('userId', userId)
            .where('month', month)
            .select(
                'totalWorkDays',
                'totalWorkHours',
                'totalOvertimeHours',
                'totalOvertimeDays',
                'totalLateDays',
                'totalEarlyLeaveDays',
                'totalLateMinutes',
                'totalEarlyLeaveMinutes',
                'totalPaidLeaveDays',
                'totalUnpaidLeaveDays',
                'totalPenalty',
                'totalLatePenalty',
                'totalEarlyLeavePenalty',
                'totalOvertimeSalary',
                'baseSalary',
                'totalAllowance',
                'finalSalary',
                'approvedBy',
                'approvedAt',
                'notes'
            )
            .first();
    }
}

export default ApprovedAttendanceModel;
