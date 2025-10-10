import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

class ApprovedAttendanceModel extends Model {
    static override tableName = 'approved_attendances';

    id!: number;
    userId!: number;
    departmentId!: number;
    month!: string;
    date!: string;
    checkInTime!: string | null;
    checkOutTime!: string | null;
    dailyTotalWorkHours!: number;
    lateMinutes!: number;
    earlyDepartureMinutes!: number;
    dailyWorkingUnit!: number;
    earlyLeavePenalty!: number;
    lateArrivalPenalty!: number;
    otWorkingUnit!: number;
    otMinutes!: number;
    otSalary!: number;
    
    // Thông tin thống kê tháng
    totalWorkDays!: number;
    totalWorkHours!: number;
    totalOvertimeHours!: number;
    totalLateDays!: number;
    totalEarlyLeaveDays!: number;
    totalPenalty!: number;
    totalOvertimeSalary!: number;
    
    // Thông tin người duyệt
    approvedBy!: number;
    approvedAt!: string;
    notes!: string | null;
    
    created_at!: string;
    updated_at!: string;

    static override get jsonSchema() {
        return {
            type: 'object',
            required: ['userId', 'departmentId', 'month', 'date', 'approvedBy'],
            properties: {
                id: { type: 'integer' },
                userId: { type: 'integer' },
                departmentId: { type: 'integer' },
                month: { type: 'string' },
                date: { type: 'string' },
                checkInTime: { type: ['string', 'null'] },
                checkOutTime: { type: ['string', 'null'] },
                dailyTotalWorkHours: { type: ['number', 'string'], default: 0 },
                lateMinutes: { type: ['number', 'string'], default: 0 },
                earlyDepartureMinutes: { type: ['number', 'string'], default: 0 },
                dailyWorkingUnit: { type: ['number', 'string'], default: 0 },
                earlyLeavePenalty: { type: ['number', 'string'], default: 0 },
                lateArrivalPenalty: { type: ['number', 'string'], default: 0 },
                otWorkingUnit: { type: ['number', 'string'], default: 0 },
                otMinutes: { type: ['number', 'string'], default: 0 },
                otSalary: { type: ['number', 'string'], default: 0 },
                totalWorkDays: { type: ['number', 'string'], default: 0 },
                totalWorkHours: { type: ['number', 'string'], default: 0 },
                totalOvertimeHours: { type: ['number', 'string'], default: 0 },
                totalLateDays: { type: ['number', 'string'], default: 0 },
                totalEarlyLeaveDays: { type: ['number', 'string'], default: 0 },
                totalPenalty: { type: ['number', 'string'], default: 0 },
                totalOvertimeSalary: { type: ['number', 'string'], default: 0 },
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

    // Helper methods
    static async getByUserAndMonth(userId: number, month: string) {
        return this.query()
            .where('userId', userId)
            .where('month', month)
            .orderBy('date', 'asc');
    }

    static async getByDepartmentAndMonth(departmentId: number, month: string) {
        return this.query()
            .where('departmentId', departmentId)
            .where('month', month)
            .withGraphFetched('user')
            .orderBy('userId')
            .orderBy('date', 'asc');
    }

    static async isApproved(userId: number, month: string): Promise<boolean> {
        const count = await this.query()
            .where('userId', userId)
            .where('month', month)
            .resultSize();
        return count > 0;
    }

    static async getMonthlySummary(userId: number, month: string) {
        return this.query()
            .where('userId', userId)
            .where('month', month)
            .select(
                'totalWorkDays',
                'totalWorkHours',
                'totalOvertimeHours',
                'totalLateDays',
                'totalEarlyLeaveDays',
                'totalPenalty',
                'totalOvertimeSalary'
            )
            .first();
    }
}

export default ApprovedAttendanceModel;
