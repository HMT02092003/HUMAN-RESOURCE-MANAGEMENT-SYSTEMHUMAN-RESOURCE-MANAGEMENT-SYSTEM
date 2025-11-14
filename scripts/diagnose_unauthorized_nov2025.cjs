const Knex = require('knex');
const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(isSameOrBefore);

(async function() {
  const attendKnex = Knex({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'postgres', password: '123456', database: 'attendance_service' } });
  const appKnex = Knex({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'postgres', password: '123456', database: 'application_service' } });
  const authKnex = Knex({ client: 'pg', connection: { host: 'localhost', port: 5432, user: 'postgres', password: '123456', database: 'auth_service' } });

  const month = '2025-11';
  const daysInMonth = dayjs(`${month}-01`).daysInMonth();
  const todayStr = dayjs().format('YYYY-MM-DD');
  const users = Array.from({length: 100}, (_, i) => i + 2); // 2..101

  // Load working days setting
  let workingDaysConfig = null;
  try {
    const s = await attendKnex('settings').where('key', 'WorkingDays').first();
    if (s && s.value) workingDaysConfig = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
  } catch (e) { /* ignore */ }

  // Load holidays into a set
  const holidaySet = new Set();
  try {
    const hrs = await attendKnex('holidays').select('start_date','end_date');
    for (const hr of hrs) {
      if (!hr.start_date || !hr.end_date) continue;
      let cur = dayjs(hr.start_date);
      const end = dayjs(hr.end_date);
      while (cur.isBefore(end) || cur.isSame(end,'day')) {
        holidaySet.add(cur.format('YYYY-MM-DD'));
        cur = cur.add(1,'day');
      }
    }
  } catch (e) { /* ignore */ }

  console.log('WorkingDays config:', workingDaysConfig);
  console.log('Holidays count:', holidaySet.size);

  const results = [];

  for (const userId of users) {
    // Fetch user startDate
    let userStartDate = null;
    try {
      const u = await authKnex('users').where('id', userId).select('startDate').first();
      if (u && u.startDate) userStartDate = dayjs(u.startDate).format('YYYY-MM-DD');
    } catch (e) {}

    // Get attendance rows for month
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2,'0')}`;
    const rows = await attendKnex('time_attendances').where('userId', userId).whereBetween('date', [startDate, endDate]).select('date','checkInTime','checkOutTime');
    const attendanceDays = new Set(rows.map(r => dayjs(r.date).format('YYYY-MM-DD')));

    // Get approved applications for user in that month
    let approvedApps = [];
    try {
      const resp = await appKnex('applications').where('userId', userId).andWhere('status', 1).andWhere(function() {
        this.where('created_at', '>=', startDate).andWhere('created_at', '<=', endDate)
      }).select('data','type');
      approvedApps = resp;
    } catch (e) {}

    // Build leave and businessTrip sets from apps
    const leaveSet = new Set();
    const bizSet = new Set();
    for (const app of approvedApps) {
      let data = {};
      try { data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data; } catch(e) { data = app.data || {}; }
      if (app.type === 'leave' || String(app.type).toLowerCase().includes('leave')) {
        if (data.date) leaveSet.add(dayjs(data.date).format('YYYY-MM-DD'));
        else if (data.startDate && data.endDate) {
          let start = dayjs(data.startDate), end = dayjs(data.endDate);
          if (start.isAfter(end)) { const t = start; start = end; end = t; }
          let cur = start;
          while (cur.isBefore(end) || cur.isSame(end,'day')) { leaveSet.add(cur.format('YYYY-MM-DD')); cur = cur.add(1,'day'); }
        }
      }
      if (app.type === 'business-trip' || String(app.type).toLowerCase().includes('business')) {
        if (data.date) bizSet.add(dayjs(data.date).format('YYYY-MM-DD'));
        else if (data.startDate && data.endDate) {
          let start = dayjs(data.startDate), end = dayjs(data.endDate);
          if (start.isAfter(end)) { const t = start; start = end; end = t; }
          let cur = start;
          while (cur.isBefore(end) || cur.isSame(end,'day')) { bizSet.add(cur.format('YYYY-MM-DD')); cur = cur.add(1,'day'); }
        }
      }
    }

    // Compute unauthorized dates using same logic as MonthlyReportService
    const unauthorizedDates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = dayjs(`${month}-${String(d).padStart(2,'0')}`).format('YYYY-MM-DD');
      // before startDate
      if (userStartDate && dayjs(dateKey).isBefore(userStartDate,'day')) continue;
      // scheduled working day
      const dow = dayjs(dateKey).day();
      const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const dayKey = dayNames[dow];
      const cfgIsWork = workingDaysConfig ? !!workingDaysConfig[dayKey] : true;
      if (!cfgIsWork) continue;
      // holiday
      if (holidaySet.has(dateKey)) continue;
      // only up to today
      if (!dayjs(dateKey).isSameOrBefore(todayStr,'day')) continue;
      // if attendance exists -> skip
      if (attendanceDays.has(dateKey)) continue;
      // if approved leave or bizTrip -> skip
      if (leaveSet.has(dateKey) || bizSet.has(dateKey)) continue;
      unauthorizedDates.push(dateKey);
    }

    // Load stored monthly_attendance unauthorized count
    let stored = null;
    try {
      stored = await attendKnex('monthly_attendances').where({ userId, month }).first();
    } catch (e) {}
    const storedCount = stored ? Number(stored.unauthorizedAbsenceDays || 0) : null;

    if (storedCount !== unauthorizedDates.length) {
      results.push({ userId, storedCount, computed: unauthorizedDates.length, unauthorizedDates: unauthorizedDates.slice(0,10) });
    }
  }

  console.log('\nDiscrepancies (users where stored unauthorizedDays != computed):', results.length);
  console.log(JSON.stringify(results, null, 2));

  // NOTE: I will NOT modify DB automatically without your confirmation.
  // If you want me to apply fixes (upsert monthly_attendances to match computed unauthorized days
  // and recalculate unauthorized-penalty using salary profiles), reply with exactly: apply fixes
  // and I will run the updater which will patch the affected monthly_attendances rows.

  await attendKnex.destroy();
  await appKnex.destroy();
  await authKnex.destroy();
  process.exit(0);
})();
