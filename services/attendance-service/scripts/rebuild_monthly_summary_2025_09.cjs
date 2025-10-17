#!/usr/bin/env node
/**
 * Generalized rebuild script for monthly_summaries.
 * Usage: node rebuild_monthly_summary_2025_09.cjs <year> <month>
 */
const knex = require('knex');
const dayjs = require('dayjs');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_DATABASE || 'attendance_service'
  },
  pool: { min: 0, max: 10 }
});

async function computeFor(year, month) {
  console.log(`Computing monthly summaries for ${year}-${String(month).padStart(2,'0')}`);

  // collect all users who have time_attendances or approved applications in that month
  const usersFromAttendances = await db('time_attendances')
    .distinct('userId').whereRaw("date_part('year', \"date\") = ?", [year]).andWhereRaw("date_part('month', \"date\") = ?", [month]);

  let usersFromApplications = [];
  try {
    usersFromApplications = await db('applications')
      .distinct('userId').whereRaw("date_part('year', approvedDate) = ?", [year]).andWhereRaw("date_part('month', approvedDate) = ?", [month]).andWhere('status', 1);
  } catch (e) {
    // applications table not present in this DB
    usersFromApplications = [];
  }

  const userSet = new Set();
  usersFromAttendances.forEach(r => userSet.add(r.userId));
  usersFromApplications.forEach(r => userSet.add(r.userId));

  for (const userId of Array.from(userSet)) {
    // aggregate from time_attendances
    const agg = await db('time_attendances')
      .where({ userId })
      .andWhereRaw("date_part('year', \"date\") = ?", [year])
      .andWhereRaw("date_part('month', \"date\") = ?", [month])
      .select(db.raw("COUNT(*) FILTER (WHERE \"day_type\" = 'WORKDAY' AND COALESCE(\"dailyTotalWorkHours\",0) > 0) as \"totalWorkDays\""))
      .select(db.raw('SUM(COALESCE("dailyTotalWorkHours",0)) as "totalWorkHours"'))
      .select(db.raw("COUNT(*) FILTER (WHERE COALESCE(\"lateMinutes\",0) > 0) as \"totalLateDays\""))
      .select(db.raw('SUM(COALESCE("lateMinutes",0)) as "totalLateMinutes"'))
      .select(db.raw("COUNT(*) FILTER (WHERE COALESCE(\"earlyDepartureMinutes\",0) > 0) as \"totalEarlyLeaveDays\""))
      .select(db.raw('SUM(COALESCE("earlyDepartureMinutes",0)) as "totalEarlyLeaveMinutes"'))
      .select(db.raw('SUM(COALESCE("otMinutes",0)) as "sumOtMinutes"'))
      .select(db.raw('COUNT(*) FILTER (WHERE COALESCE("otMinutes",0) > 0) as "totalOvertimeDays"'))
      .select(db.raw('SUM(COALESCE("otSalary",0)) as "totalOvertimeSalary"'))
      .select(db.raw('SUM(COALESCE("earlyLeavePenalty",0)) as "totalEarlyLeavePenalty"'))
      .select(db.raw('SUM(COALESCE("lateArrivalPenalty",0)) as "totalLatePenalty"'))
      .select(db.raw("COUNT(*) FILTER (WHERE \"day_type\" = 'LEAVE') as \"paidLeavesFromAttendances\""))
      .select(db.raw("COUNT(*) FILTER (WHERE \"day_type\" = 'BUSINESS_TRIP') as \"businessTripDays\""))
      .first();

    // attempt to read approved applications — skip if applications table missing
    let paidLeaveDaysFromApps = 0;
    try {
      const approvedApps = await db('applications').where({ userId, status: 1 }).andWhere(function(){
        this.whereRaw("date_part('year', approvedDate) = ?", [year]).andWhereRaw("date_part('month', approvedDate) = ?", [month]);
      }).select('id','type','data');

      for (const a of approvedApps) {
        try {
          const d = a.data || {};
          const start = d.startDate || d.start_date || d.start;
          const end = d.endDate || d.end_date || d.end;
          if (start && end) {
            const s = dayjs(start).startOf('day');
            const e = dayjs(end).startOf('day');
            const days = e.diff(s,'day') + 1;
            if (a.type === 'leave') paidLeaveDaysFromApps += days;
            else if (a.type === 'business-trip') paidLeaveDaysFromApps += days;
          } else {
            if (a.type === 'leave') paidLeaveDaysFromApps += 1;
          }
        } catch(e) {}
      }
    } catch(e) {
      // applications table not present in this DB; skip
      paidLeaveDaysFromApps = 0;
    }

    // Count unpaid leaves (unauthorized absence) by checking day_type null and no attendance
    // Here we approximate: unpaid days = totalWorkDays expected - actual workdays - paid leaves
    // To get expectedWorkDays, we read settings.WorkingDays and holidays to compute scheduled workdays in the month
    const settings = await db('settings').where({ key: 'WorkingHours' }).first().catch(()=>null);

    // compute scheduled work days in the month
    const daysInMonth = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).daysInMonth();
    let expectedWorkDays = 0;
    // simple approach: count Mon-Fri as working unless holidays override
    const holidays = await db('holidays').select('date','start_date','end_date');
    const holidaySet = new Set();
    for (const h of holidays) {
      if (h.start_date && h.end_date) {
        let s = dayjs(h.start_date);
        const e = dayjs(h.end_date);
        while (s.isBefore(e) || s.isSame(e,'day')) { holidaySet.add(s.format('YYYY-MM-DD')); s = s.add(1,'day'); }
      } else if (h.date) holidaySet.add(dayjs(h.date).format('YYYY-MM-DD'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = dayjs(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      const dow = date.day(); // 0 Sun ... 6 Sat
      if (dow === 0 || dow === 6) continue; // weekend
      if (holidaySet.has(date.format('YYYY-MM-DD'))) continue;
      expectedWorkDays++;
    }

    const totalWorkDays = Number(agg.totalWorkDays || 0);
    const totalPaidLeaveDays = Number(agg.paidLeavesFromAttendances || 0) + paidLeaveDaysFromApps;
    const totalUnpaidLeaveDays = Math.max(0, expectedWorkDays - totalWorkDays - totalPaidLeaveDays);

    const payload = {
      user_id: userId,
      month,
      year,
      totalWorkDays: totalWorkDays,
      totalWorkHours: Number(agg.totalWorkHours || 0),
      totalLateDays: Number(agg.totalLateDays || 0),
      totalEarlyLeaveDays: Number(agg.totalEarlyLeaveDays || 0),
      totalLateMinutes: Number(agg.totalLateMinutes || 0),
      totalEarlyLeaveMinutes: Number(agg.totalEarlyLeaveMinutes || 0),
      totalOvertimeDays: Number(agg.totalOvertimeDays || 0),
      totalOvertimeHours: Number(((agg.sumOtMinutes || 0)/60).toFixed(2)),
      totalOvertimeSalary: Number(agg.totalOvertimeSalary || 0),
      totalPaidLeaveDays: totalPaidLeaveDays,
      totalUnpaidLeaveDays: totalUnpaidLeaveDays,
      totalLatePenalty: Number(agg.totalLatePenalty || 0),
      totalEarlyLeavePenalty: Number(agg.totalEarlyLeavePenalty || 0),
      totalPenalty: Number((agg.totalLatePenalty || 0) + (agg.totalEarlyLeavePenalty || 0) || agg.totalPenalty || 0),
      finalSalary: 0,
      status: 'IN_PROGRESS',
      created_at: new Date(),
      updated_at: new Date()
    };

    const exists = await db('monthly_summaries').where({ user_id: userId, month, year }).first();
    if (exists) {
      await db('monthly_summaries').where({ id: exists.id }).update({ ...payload, updated_at: new Date() });
      console.log(`Updated monthly_summary for user ${userId} for ${year}-${month}`);
    } else {
      await db('monthly_summaries').insert(payload);
      console.log(`Inserted monthly_summary for user ${userId} for ${year}-${month}`);
    }
  }

  console.log('Compute complete');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node rebuild_monthly_summary_2025_09.cjs <year> <month>');
    process.exit(1);
  }
  const year = Number(args[0]);
  const month = Number(args[1]);
  await computeFor(year, month);
  process.exit(0);
}

main().catch(e=>{console.error(e); process.exit(1)});
