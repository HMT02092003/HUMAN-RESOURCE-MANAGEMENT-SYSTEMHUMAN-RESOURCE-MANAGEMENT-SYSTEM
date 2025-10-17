#!/usr/bin/env node
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_DATABASE || 'attendance_service'
  }
});

async function ensure() {
  const cols = [
    { name: 'totalLateDays', type: "integer default 0" },
    { name: 'totalEarlyLeaveDays', type: "integer default 0" },
    { name: 'totalLateMinutes', type: "integer default 0" },
    { name: 'totalEarlyLeaveMinutes', type: "integer default 0" },
    { name: 'totalOvertimeDays', type: "integer default 0" },
    { name: 'totalOvertimeHours', type: "decimal(15,2) default 0" },
    { name: 'totalOvertimeSalary', type: "decimal(15,2) default 0" },
    { name: 'totalPaidLeaveDays', type: "integer default 0" },
    { name: 'totalUnpaidLeaveDays', type: "integer default 0" },
    { name: 'totalLatePenalty', type: "decimal(15,2) default 0" },
    { name: 'totalEarlyLeavePenalty', type: "decimal(15,2) default 0" },
    { name: 'totalPenalty', type: "decimal(15,2) default 0" }
  ];

  for (const c of cols) {
    const exists = await db('information_schema.columns')
      .where({ table_name: 'monthly_summaries', column_name: c.name })
      .first();
    if (!exists) {
      console.log('Adding column', c.name);
      await db.raw(`ALTER TABLE monthly_summaries ADD COLUMN \"${c.name}\" ${c.type}`);
    } else {
      console.log('Already exists', c.name);
    }
  }

  console.log('Done');
  process.exit(0);
}

ensure().catch(e=>{console.error(e); process.exit(1)});
