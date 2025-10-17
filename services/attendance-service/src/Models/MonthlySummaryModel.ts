import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

class MonthlySummaryModel extends Model {
    static override tableName = 'monthly_summaries';

    id!: number;
    user_id!: number;
    month!: number;
    year!: number;
    totalWorkDays!: number;
    totalWorkHours!: number;
    totalLateMinutes!: number;
    totalEarlyLeaveMinutes!: number;
    totalLateDays!: number;
    totalEarlyLeaveDays!: number;
    totalOvertimeHours!: number;
    totalOvertimeDays!: number;
    totalOvertimeSalary!: number;
    totalPaidLeaveDays!: number;
    totalUnpaidLeaveDays!: number;
    totalLatePenalty!: number;
    totalEarlyLeavePenalty!: number;
    totalPenalty!: number;
    finalSalary!: number;
    status!: string; // IN_PROGRESS | CLOSED
    created_at!: string;
    updated_at!: string;

    static override get jsonSchema() {
        return {
            type: 'object',
            required: ['user_id', 'month', 'year'],
            properties: {
                id: { type: 'integer' },
                user_id: { type: 'integer' },
                month: { type: 'integer' },
                year: { type: 'integer' },
                totalWorkDays: { type: 'integer', default: 0 },
                totalWorkHours: { type: ['number','string'], default: 0 },
                totalLateMinutes: { type: 'integer', default: 0 },
                totalEarlyLeaveMinutes: { type: 'integer', default: 0 },
                totalLateDays: { type: 'integer', default: 0 },
                totalEarlyLeaveDays: { type: 'integer', default: 0 },
                totalOvertimeHours: { type: ['number','string'], default: 0 },
                totalOvertimeDays: { type: 'integer', default: 0 },
                totalOvertimeSalary: { type: ['number','string'], default: 0 },
                totalPaidLeaveDays: { type: 'integer', default: 0 },
                totalUnpaidLeaveDays: { type: 'integer', default: 0 },
                totalLatePenalty: { type: ['number','string'], default: 0 },
                totalEarlyLeavePenalty: { type: ['number','string'], default: 0 },
                totalPenalty: { type: ['number','string'], default: 0 },
                finalSalary: { type: ['number','string'], default: 0 },
                status: { type: 'string', default: 'IN_PROGRESS' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
            }
        };
    }

    override $beforeInsert() {
        this.created_at = new Date().toISOString();
        this.updated_at = new Date().toISOString();
    }

    override $beforeUpdate() {
        this.updated_at = new Date().toISOString();
    }
}

export default MonthlySummaryModel;
