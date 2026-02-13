import { Model } from 'objection';
import connection from '@/lib/Databases/Connection';

Model.knex(connection as any);

class TimeAttendanceModel extends Model {
    static override tableName = 'time_attendances';

    id!: number;
    userId!: number;
    date!: string;
    checkInTime!: string | null;
    checkOutTime!: string | null;
    dailyTotalWorkHours!: number;
    lateMinutes!: number;
    earlyDepartureMinutes!: number;
    dailyWorkingUnit!: number;
    totalWorkingUnit!: number; // Tổng công (bao gồm cả OT)
    otWorkingUnit!: number; // Công OT riêng
    overtimeHours!: number; // Giờ OT thực tế
    earlyLeavePenalty!: number;
    lateArrivalPenalty!: number;
    created_at!: string;
    updated_at!: string;

    static override get jsonSchema() {
        return {
            type: 'object',
            required: ['userId', 'date'],
            properties: {
                id: { type: 'integer' },
                userId: { type: 'integer' },
                date: { type: 'string' },
                checkInTime: { type: ['string', 'null'] },
                checkOutTime: { type: ['string', 'null'] },
                dailyTotalWorkHours: { type: ['number', 'string'], default: 0 },
                lateMinutes: { type: ['number', 'string'], default: 0 },
                earlyDepartureMinutes: { type: ['number', 'string'], default: 0 },
                dailyWorkingUnit: { type: ['number', 'string'], default: 0 },
                totalWorkingUnit: { type: ['number', 'string'], default: 0 },
                otWorkingUnit: { type: ['number', 'string'], default: 0 },
                overtimeHours: { type: ['number', 'string'], default: 0 },
                earlyLeavePenalty: { type: ['number', 'string'], default: 0 },
                lateArrivalPenalty: { type: ['number', 'string'], default: 0 },
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

export default TimeAttendanceModel;
