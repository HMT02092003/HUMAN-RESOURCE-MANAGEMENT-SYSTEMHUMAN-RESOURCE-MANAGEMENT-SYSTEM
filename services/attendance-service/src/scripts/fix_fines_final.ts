
import { Model } from 'objection';
import Knex from 'knex';
import * as dotenv from 'dotenv';
import dayjs from 'dayjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the service root
dotenv.config({ path: path.join(__dirname, '../../.env') });

import TimeAttendanceModel from '../Models/TimeAttendanceModel';
import AttendanceCalculationService from '../services/attendance/AttendanceCalculationService';
import { MonthlyReportService } from '../services/MonthlyReportService';

const knexConfig = {
    client: 'pg',
    connection: {
        host: process.env['DB_HOST'] || '127.0.0.1',
        user: process.env['DB_USER'] || 'postgres',
        password: process.env['DB_PASSWORD'] || '123456',
        database: process.env['DB_DATABASE'] || 'attendance_service',
        port: parseInt(process.env['DB_PORT'] || '5433')
    }
};

const knex = Knex(knexConfig);
Model.knex(knex);

async function run() {
    console.log('🚀 Dọn dẹp dữ liệu chấm công và tính lại tiền phạt (Lần 2 - Đã sửa kết nối Salary DB)...');
    console.log('📅 Cấu hình: Giờ hành chính 08:00 - 17:00 cho toàn bộ bản ghi');
    console.log(`🔗 Database: ${knexConfig.connection.host}:${knexConfig.connection.port}, DB: ${knexConfig.connection.database}`);

    try {
        const startDate = '2026-02-01';
        const endDate = '2026-02-28';

        // 1. Lấy toàn bộ bản ghi chấm công trong tháng 2
        const records = await TimeAttendanceModel.query()
            .whereBetween('date', [startDate, endDate])
            .orderBy('date', 'asc');

        console.log(`📊 Tìm thấy ${records.length} bản ghi chấm công cần xử lý.`);

        for (const record of records) {
            const dateKey = dayjs(record.date).format('YYYY-MM-DD');

            // Kiểm tra xem có phải cuối tuần không
            const dayOfWeek = dayjs(dateKey).day();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Tính toán lại theo khung giờ cố định 08:00 - 17:00
            // Chúng ta truyền null cho shiftInfo để ép dùng giờ mặc định (8-17)
            const calc = await AttendanceCalculationService.calculateAttendance(
                record.checkInTime,
                record.checkOutTime,
                dateKey,
                record.userId,
                undefined, // No token needed for this calculation
                null,      // No OT end time (unless we want to keep it)
                undefined, // Auto-detect holiday
                undefined, // NULL shiftInfo -> defaults to settings (8-17)
                null,      // No OT start time
                isWeekend
            );

            // Cập nhật lại bản ghi
            await TimeAttendanceModel.query()
                .where('id', record.id)
                .patch({
                    lateMinutes: calc.lateMinutes,
                    earlyDepartureMinutes: calc.earlyDepartureMinutes,
                    lateArrivalPenalty: calc.latePenaltyAmount,
                    earlyLeavePenalty: calc.earlyLeavePenaltyAmount,
                    dailyTotalWorkHours: calc.workHours,
                    dailyWorkingUnit: calc.dailyWorkingUnit,
                    totalWorkingUnit: calc.totalWorkingUnit,
                    otWorkingUnit: calc.otWorkingUnit,
                    overtimeHours: calc.overtimeHours || 0,
                    updated_at: new Date().toISOString()
                });

            console.log(`✅ [${dateKey}] User ${record.userId}: Fine Adjusted. Late: ${calc.lateMinutes}m, Penalty: ${calc.latePenaltyAmount + calc.earlyLeavePenaltyAmount} VNĐ`);
        }

        // 2. Sau khi sửa các bản ghi chi tiết, tính toán lại Monthly Summary cho tất cả User bị ảnh hưởng
        const affectedUserIds = [...new Set(records.map(r => r.userId))];
        console.log(`\n🔄 Đang tính toán lại bảng tổng hợp tháng cho ${affectedUserIds.length} nhân viên...`);

        for (const userId of affectedUserIds) {
            console.log(`⏳ Processing Summary for User ${userId}...`);
            await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, '2026-02-01');
        }

        console.log('\n🎉 Hoàn thành! Dữ liệu đã được sửa và tính toán lại chính xác.');
    } catch (error) {
        console.error('❌ Lỗi khi chạy script:', error);
    } finally {
        await knex.destroy();
        process.exit(0);
    }
}

run();
