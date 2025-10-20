import dotenv from 'dotenv';
dotenv.config();

import { MonthlyReportService } from '../src/services/MonthlyReportService';

async function run() {
  const runs = [
    { userId: 7, date: '2025-10-01' },
    { userId: 5, date: '2025-11-01' }
  ];

  for (const r of runs) {
    console.log(`Recomputing monthly for userId=${r.userId} month=${r.date}`);
    const res = await MonthlyReportService.calculateAndSaveMonthlyAttendance(r.userId, r.date);
    console.log('Result:', res);
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
