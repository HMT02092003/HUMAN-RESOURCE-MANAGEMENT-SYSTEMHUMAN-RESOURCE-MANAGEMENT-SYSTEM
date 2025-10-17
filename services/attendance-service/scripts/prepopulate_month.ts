/**
 * Simple script to prepopulate time_attendances for holidays and weekends for a given month/year.
 * Usage (node transpiled js): node prepopulate_month.js 2025 10
 * This file is TypeScript for clarity; you may compile it or run with ts-node.
 */
import dayjs from 'dayjs';
// Use the project's attendance-service DB connection
// require the compiled TS output or the TS source depending on execution environment
const dbConnectionPath = require.resolve('../src/lib/Databases/Connection');
const db = require(dbConnectionPath).default || require(dbConnectionPath);

// If you prefer to use knex directly, you can also import knex and build a new instance using env vars
import knex from 'knex';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node prepopulate_month.js <year> <month> [userId]');
    process.exit(1);
  }

  const year = Number(args[0]);
  const month = Number(args[1]);
  const userId = args[2] ? Number(args[2]) : null;

  // `db` is the knex instance exported from src/lib/Databases/Connection

  const daysInMonth = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).daysInMonth();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = dayjs(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`).format('YYYY-MM-DD');
    const dayOfWeek = dayjs(date).day(); // 0 Sun - 6 Sat
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : 'WORKDAY';

    const where: any = { date };
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
