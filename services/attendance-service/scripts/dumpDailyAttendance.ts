import dotenv from 'dotenv';
dotenv.config();

import TimeAttendanceModel from '../src/Models/TimeAttendanceModel';
import dayjs from 'dayjs';

async function run() {
  const userId = 7;
  const month = '2025-10';
  const start = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
  const end = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');
  const rows = await TimeAttendanceModel.query().where('userId', userId).whereBetween('date', [start, end]).orderBy('date', 'asc');
  console.log('Found', rows.length, 'rows for', userId, month);
  for (const r of rows) console.log(r.date, r.checkInTime, r.checkOutTime, r.dailyTotalWorkHours, r.lateMinutes, r.earlyDepartureMinutes, r.dailyWorkingUnit);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
