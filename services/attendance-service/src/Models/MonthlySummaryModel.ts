import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

/**
 * Model cho bảng monthly_attendances
 * Lưu thông tin TỔNG HỢP chấm công THÁNG đã được duyệt
 * - 1 user = 1 record cho 1 tháng
 * - Chi tiết từng ngày xem ở bảng time_attendances
 */
class MonthlySummaryModel extends Model {
    static override tableName = 'monthly_attendances';

    id!: number;
    userId!: number;
    departmentId!: number;
    month!: string; // Format: YYYY-MM
    
    // ========== MONTHLY SUMMARY FIELDS ==========
    totalWorkDays!: number;
    totalWorkHours!: number;
    
    totalLateDays!: number;
    totalEarlyLeaveDays!: number;
    totalLateMinutes!: number;
    totalEarlyLeaveMinutes!: number;
    
    totalOvertimeHours!: number;
    totalOvertimeDays!: number;
    totalOvertimeSalary!: number;
    
    totalPaidLeaveDays!: number;
    totalUnpaidLeaveDays!: number;
    
    totalLatePenalty!: number;
    totalEarlyLeavePenalty!: number;
    totalPenalty!: number;
    
    baseSalary!: number | null;
    totalAllowance!: number;
    finalSalary!: number | null;
    
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
                from: 'monthly_attendances.userId',
                to: 'users.id'
            }
        },
        approver: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'UserModel',
            join: {
                from: 'monthly_attendances.approvedBy',
                to: 'users.id'
            }
        },
        department: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'DepartmentModel',
            join: {
                from: 'monthly_attendances.departmentId',
                to: 'departments.id'
            }
        }
    };

    // ========== HELPER METHODS ==========
    static async getByUserAndMonth(userId: number, month: string) {
        return this.query()
            .where('userId', userId)
            .where('month', month)
            .first();
    }

    static async getByDepartmentAndMonth(departmentId: number, month: string) {
        return this.query()
            .where('departmentId', departmentId)
            .where('month', month)
            .withGraphFetched('user')
            .orderBy('userId');
    }

    static async isApproved(userId: number, month: string): Promise<boolean> {
        const record = await this.query()
            .where('userId', userId)
            .where('month', month)
            .first();
        return !!record;
    }

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

export default MonthlySummaryModel;
