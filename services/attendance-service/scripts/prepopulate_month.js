#!/usr/bin/env node
// Transpiled JS helper for prepopulate_month.ts to avoid ts-node/ESM issues.
const dayjs = require('dayjs');
// Load knex connection from project
let db;
try {
  // CommonJS require of compiled connection or source
  const conn = require('../src/lib/Databases/Connection');
  db = conn.default || conn;
} catch (err) {
  console.error('Failed to load DB connection from ../src/lib/Databases/Connection', err.message);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node prepopulate_month.js <year> <month> [userId]');
    process.exit(1);
  }

  const year = Number(args[0]);
  const month = Number(args[1]);
  const userId = args[2] ? Number(args[2]) : null;

  const daysInMonth = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).daysInMonth();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = dayjs(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`).format('YYYY-MM-DD');
    const dayOfWeek = dayjs(date).day(); // 0 Sun - 6 Sat
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : 'WORKDAY';

    const where = { date };
    if (userId) where.userId = userId;

    const exists = await db('time_attendances').where(where).first();
    if (exists) continue;

    if (dayType === 'WEEKEND') {
      await db('time_attendances').insert({ userId: userId || 0, date, day_type: 'WEEKEND' });
      console.log(`Inserted WEEKEND for ${date}`);
    }
  }

  console.log('Done');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
