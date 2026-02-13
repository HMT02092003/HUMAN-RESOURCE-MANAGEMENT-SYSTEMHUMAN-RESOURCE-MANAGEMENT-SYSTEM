
import dotenv from 'dotenv';
dotenv.config();

import knex from '../src/lib/Databases/Connection.js';
import TimeAttendanceModel from '../src/Models/TimeAttendanceModel.js';
import { MonthlyReportService } from '../src/services/MonthlyReportService.js';
import dayjs from 'dayjs';

async function main() {
    try {
        console.log('🚀 MASTER RECALCULATION STARTING (OCT 2025 - FEB 2026)...');

        // Get all userIds that have attendance data
        const users = await TimeAttendanceModel.query().distinct('userId').select('userId');
        const userIds = users.map(u => u.userId).sort((a, b) => a - b);

        console.log(`👤 Found ${userIds.length} users to process.`);

        const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];

        for (const month of months) {
            console.log(`\n📅 Month: ${month}`);
            for (const userId of userIds) {
                try {
                    const firstDay = `${month}-01`;
                    process.stdout.write(`   Processing user ${userId}... `);
                    // Call the system's own logic to aggregate everything
                    await MonthlyReportService.calculateAndSaveMonthlyAttendance(userId, firstDay);
                    console.log('✅');
                } catch (err: any) {
                    console.log(`❌ Error: ${err.message}`);
                }
            }
        }

        console.log('\n🎉 ALL CALCULATIONS COMPLETED SUCCESSFULLY!');
    } catch (error) {
        console.error('💥 CRITICAL ERROR:', error);
    } finally {
        if (knex) await knex.destroy();
        process.exit(0);
    }
}

main();
