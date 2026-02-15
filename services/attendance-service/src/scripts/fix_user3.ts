
import { MonthlyReportService } from '../services/MonthlyReportService';
import knex from 'knex';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const db = knex({
    client: 'pg',
    connection: {
        host: process.env['DB_HOST'] || '127.0.0.1',
        port: Number(process.env['DB_PORT']) || 5432,
        user: process.env['DB_USER'] || 'postgres',
        password: process.env['DB_PASSWORD'] || '123456',
        database: process.env['DB_DATABASE'] || 'attendance_service',
    },
});

async function main() {
    console.log('🚀 Recalculating User 3 for 2026-02...');
    try {
        const result = await MonthlyReportService.calculateAndSaveMonthlyAttendance(3, '2026-02-01');
        console.log('✅ Recalculation done:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await db.destroy();
    }
}

main();
