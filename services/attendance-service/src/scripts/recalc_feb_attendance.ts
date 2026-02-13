
import { Model } from 'objection';
import Knex from 'knex';
import * as dotenv from 'dotenv';
// Load env
dotenv.config();

import { AttendanceCalculationService } from '../services/attendance/AttendanceCalculationService';
import MonthlySummaryModel from '../models/MonthlySummaryModel';

const knexConfig = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '123456',
        database: process.env.DB_NAME || 'attendance_service',
        port: parseInt(process.env.DB_PORT || '5432')
    }
};

const knex = Knex(knexConfig);
Model.knex(knex);

async function run() {
    console.log('🚀 Recalculating attendance for Feb 2026...');

    try {
        const month = '2026-02';
        // GetAll summaries for the month
        const summaries = await MonthlySummaryModel.query().where('month', month);

        console.log(`Found ${summaries.length} summaries to check.`);

        for (const s of summaries) {
            console.log(`Processing User ${s.userId} (Current Penalty: ${s.totalPenalty})...`);
            await AttendanceCalculationService.recalculateMonthlyAttendance(s.userId, month);
            console.log(`✅ User ${s.userId} recalculated.`);
        }

        console.log('🎉 Done!');
    } catch (error) {
        console.error('Error running script:', error);
    } finally {
        await knex.destroy();
        process.exit(0);
    }
}

run();
