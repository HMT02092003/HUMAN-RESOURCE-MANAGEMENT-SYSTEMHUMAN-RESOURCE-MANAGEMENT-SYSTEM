import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';
// Note: avoid importing UserModel/DepartmentModel from other services here to
// prevent tight coupling. Fetch related user/department data via the auth
// service endpoints when needed instead of using Objection relationMappings.

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
    month!: string; // Format: YYYY-MM

    // ========== MONTHLY SUMMARY FIELDS ==========
    totalWorkHours!: number;
    totalScheduledDays!: number;
    presentDays!: number;

    lateDays!: number;
    earlyLeaveDays!: number;
    totalLateMinutes!: number;
    totalEarlyLeaveMinutes!: number;

    totalOvertimeHours!: number;
    totalWorkingUnits!: number; // Tổng công trong tháng (bao gồm cả OT, nghỉ phép, công tác)
    totalOtWorkingUnits!: number; // Tổng công OT riêng biệt

    // totalUnpaidLeaveDays removed - use unauthorizedAbsenceDays

    totalLatePenalty!: number;
    totalEarlyLeavePenalty!: number;
    totalPenalty!: number;
    isApproved!: boolean;


    approvedBy!: number;
    approvedAt!: string;
    notes!: string | null;

    created_at!: string;
    updated_at!: string;

    static override get jsonSchema() {
        return {
            type: 'object',
            // Only require fields that exist in migration and are essential for identification
            // departmentId / approvedBy / approvedAt are optional for auto-created monthly summaries
            required: ['userId', 'month'],
            properties: {
                id: { type: 'integer' },
                userId: { type: 'integer' },
                month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' }, // YYYY-MM format

                totalScheduledDays: { type: 'integer', default: 0 },
                totalWorkHours: { type: 'number', default: 0 },
                presentDays: { type: 'integer', default: 0 },

                lateDays: { type: 'integer', default: 0 },
                totalLateMinutes: { type: 'integer', default: 0 },
                totalEarlyLeaveMinutes: { type: 'integer', default: 0 },

                totalOvertimeHours: { type: 'number', default: 0 },
                totalWorkingUnits: { type: 'number', default: 0 },
                totalOtWorkingUnits: { type: 'number', default: 0 },

                // totalUnpaidLeaveDays: removed

                totalLatePenalty: { type: 'number', default: 0 },
                totalEarlyLeavePenalty: { type: 'number', default: 0 },
                totalUnauthorizedAbsencePenalty: { type: 'number', default: 0 },
                totalPenalty: { type: 'number', default: 0 },
                isApproved: { type: 'boolean', default: false },

                totalOvertimeSalary: { oneOf: [{ type: 'number' }, { type: 'null' }] },
                averageWorkHours: { oneOf: [{ type: 'number' }, { type: 'null' }] },

                approvedBy: { oneOf: [{ type: 'integer' }, { type: 'null' }] },
                approvedAt: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                notes: { oneOf: [{ type: 'string' }, { type: 'null' }] },

                created_at: { type: 'string' },
                updated_at: { type: 'string' },
                dailyDetails: { oneOf: [{ type: 'string' }, { type: 'object' }, { type: 'null' }] }
            }
        };
    }

    // relationMappings removed intentionally. If you need related user or
    // department data, call the Auth/Employee service endpoints or perform
    // explicit joins in service-layer queries. This avoids cross-service
    // model imports and TS resolution issues.

    // ========== HELPER METHODS ==========
    static async getByUserAndMonth(userId: number, month: string) {
        return this.query()
            .where('userId', userId)
            .where('month', month)
            .first();
    }

    // Note: departmentId column removed from monthly_attendances.
    // If department-based querying is needed, filter by userId list from auth-service.

    static async isApproved(userId: number, month: string): Promise<boolean> {
        const record = await this.query()
            .where('userId', userId)
            .where('month', month)
            .first();
        return !!(record && record.isApproved);
    }

    static async getMonthlySummary(userId: number, month: string) {
        return this.query()
            .where('userId', userId)
            .where('month', month)
            .select(
                'totalScheduledDays',
                'presentDays',
                'totalWorkHours',
                'totalOvertimeHours',
                'totalLateDays',
                'totalLateMinutes',
                'totalEarlyLeaveMinutes',
                //'totalPaidLeaveDays',
                //'totalUnpaidLeaveDays',
                'totalPenalty',
                'totalLatePenalty',
                'totalEarlyLeavePenalty',
                'totalOvertimeSalary',
                'approvedBy',
                'approvedAt',
                'notes'
            )
            .first();
    }

    // Sanitize properties before insert/update to avoid writing unexpected columns
    override async $beforeInsert() {
        const allowed = [
            'userId', 'month', 'totalScheduledDays', 'presentDays', 'absentDays', 'approvedLeaveDays', 'unauthorizedAbsenceDays', 'businessTripDays',
            'lateDays', 'earlyLeaveDays', 'totalLateMinutes', 'totalEarlyLeaveMinutes', 'totalWorkHours', 'averageWorkHours', 'totalWorkingUnits',
            'totalOvertimeHours', 'totalOtWorkingUnits', 'totalEffectiveOtWorkingUnits', 'totalLatePenalty', 'totalEarlyLeavePenalty', 'totalUnauthorizedAbsencePenalty', 'totalPenalty',
            'totalOvertimeSalary', 'isApproved', 'approvedBy', 'approvedAt', 'notes', 'created_at', 'updated_at',
            'dailyDetails'
        ];
        for (const k of Object.keys(this)) {
            if (!allowed.includes(k) && k !== 'id') {
                // @ts-ignore
                delete this[k];
            }
        }
    }

    override async $beforeUpdate() {
        const allowed = [
            'userId', 'month', 'totalScheduledDays', 'presentDays', 'absentDays', 'approvedLeaveDays', 'unauthorizedAbsenceDays', 'businessTripDays',
            'lateDays', 'earlyLeaveDays', 'totalLateMinutes', 'totalEarlyLeaveMinutes', 'totalWorkHours', 'averageWorkHours', 'totalWorkingUnits',
            'totalOvertimeHours', 'totalOtWorkingUnits', 'totalEffectiveOtWorkingUnits', 'totalLatePenalty', 'totalEarlyLeavePenalty', 'totalUnauthorizedAbsencePenalty', 'totalPenalty',
            'totalOvertimeSalary', 'isApproved', 'approvedBy', 'approvedAt', 'notes', 'created_at', 'updated_at',
            'dailyDetails'
        ];
        for (const k of Object.keys(this)) {
            if (!allowed.includes(k) && k !== 'id') {
                // @ts-ignore
                delete this[k];
            }
        }
    }
}

export default MonthlySummaryModel;
