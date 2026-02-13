
/**
 * UPDATED SEED (REALISTIC): Chấm công Oct 2025 - Feb 2026
 * 
 * Logic cải tiến:
 * 1. Dữ liệu thời gian (Check-in/Check-out) được random tự nhiên (không đều tăm tắp).
 * 2. TẠO ĐƠN OT ĐỒNG BỘ:
 *    - Trước khi seed, lập kế hoạch chi tiết ngày nào OT, giờ nào.
 *    - Insert đơn OT vào Application Service tương ứng với kế hoạch.
 * 3. TẠO ATTENDANCE KHỚP VỚI ĐƠN OT:
 *    - Nếu ngày có OT -> Check-out muộn hơn giờ OT kết thúc.
 *    - Nếu ngày thường -> Check-in/out dao động quanh 08:00 - 17:00.
 * 4. Tính toán Monthly Aggregates chính xác.
 */

exports.seed = async function (knex) {
  console.log('\n======================================================================');
  console.log('🚀 MASTER SEED (REALISTIC & SYNCED): OT Apps & Attendance & Aggregates');
  console.log('======================================================================');

  // Helper: Get Random Time with Variance (e.g., 08:00 +/- 15 mins)
  const getRandomTime = (baseHour, baseMinute, varianceMinutes = 15) => {
    const date = new Date(2000, 0, 1, baseHour, baseMinute);
    const variance = Math.floor(Math.random() * varianceMinutes * 2) - varianceMinutes; // +/- variance
    date.setMinutes(date.getMinutes() + variance);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
  };

  // Helper: Add minutes to time string "HH:mm"
  const addMinutes = (timeStr, minutes) => {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m);
    date.setMinutes(date.getMinutes() + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // =============================================
  // STEP 0: Fetch Real Holidays from DB
  // =============================================
  console.log('🔎 Fetching Holidays from DB...');
  const dbHolidays = await knex('holidays')
    .select('start_date', 'end_date', 'name')
    .where('start_date', '>=', '2025-10-01')
    .andWhere('start_date', '<=', '2026-02-28');

  // Convert to set of date strings 'YYYY-MM-DD'
  const HOLIDAYS_SET = new Set();
  const HOLIDAY_NAMES = new Map();

  const toLocalYMD = (utcDateStr) => {
    const d = new Date(utcDateStr);
    const localMs = d.getTime() + (7 * 60 * 60 * 1000);
    return new Date(localMs).toISOString().split('T')[0];
  };

  for (const holiday of dbHolidays) {
    const startYMD = toLocalYMD(holiday.start_date);
    const endYMD = toLocalYMD(holiday.end_date);

    let iter = new Date(startYMD);
    const endD = new Date(endYMD);

    while (iter <= endD) {
      const dateStr = iter.toISOString().split('T')[0];
      HOLIDAYS_SET.add(dateStr);
      HOLIDAY_NAMES.set(dateStr, holiday.name);
      iter.setDate(iter.getDate() + 1);
    }
  }
  console.log('   🗓️  Holidays (Local):', Array.from(HOLIDAYS_SET).sort());


  // =============================================
  // STEP 1: PLAN OT & CONNECT APPLICATION SERVICE
  // =============================================
  console.log('\n🔌 Connecting to Application Service...');
  let appKnex;
  try {
    appKnex = require('knex')({
      client: 'pg',
      connection: {
        host: '127.0.0.1',
        port: 5433,
        database: 'application_service_final',
        user: 'postgres',
        password: '123456'
      }
    });
  } catch (err) {
    console.error(`❌ Failed to connect: ${err.message}`);
    return;
  }

  const userIds = Array.from({ length: 123 }, (_, i) => i + 1);
  const applicationsToInsert = [];
  const PLANNED_OT = new Map(); // Key: "userId-date", Value: OT Detail Object
  const PLANNED_LEAVE = new Map(); // Key: "userId-date", Value: Type
  const PLANNED_TRIP = new Map(); // Key: "userId-date", Value: Detail

  const months = [
    { year: 2025, month: 10 }, { year: 2025, month: 11 }, { year: 2025, month: 12 },
    { year: 2026, month: 1 }, { year: 2026, month: 2 }
  ];

  console.log('📝 Planning Overtime Schedule...');

  for (const m of months) {
    const daysInMonth = new Date(m.year, m.month, 0).getDate();

    for (const userId of userIds) {
      // Probability settings
      const otChance = userId <= 10 ? 0.25 : 0.08;
      const leaveChance = 0.03; // ~1 day per month
      const tripChance = 0.01;  // Rare

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${m.year}-${String(m.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dateStr > '2026-02-28') continue;

        const isHol = HOLIDAYS_SET.has(dateStr);
        const dayOfWeek = new Date(dateStr).getDay();
        const isWknd = (dayOfWeek === 0 || dayOfWeek === 6);
        const isWeekday = !isHol && !isWknd;

        // Skip if already has an application for this day
        if (PLANNED_LEAVE.has(`${userId}-${dateStr}`) || PLANNED_TRIP.has(`${userId}-${dateStr}`)) continue;

        // 1. LEAVE (RANDOM)
        if (isWeekday && Math.random() < leaveChance) {
          const isPaid = Math.random() > 0.3;
          const leaveData = {
            startDate: dateStr,
            endDate: dateStr,
            reason: isPaid ? 'Bận việc gia đình' : 'Nghỉ việc riêng (không lương)',
            leaveType: isPaid ? 'personal' : 'unpaid',
            isPaid: isPaid
          };
          PLANNED_LEAVE.set(`${userId}-${dateStr}`, leaveData);
          applicationsToInsert.push({
            type: isPaid ? 'leave' : 'unpaid_leave',
            status: 1,
            userId: userId,
            data: JSON.stringify(leaveData),
            created_at: new Date(dateStr),
            updated_at: new Date(dateStr)
          });
          continue;
        }

        // 2. BUSINESS TRIP (RANDOM)
        if (isWeekday && Math.random() < tripChance) {
          const duration = Math.floor(Math.random() * 2) + 1;
          const tripDays = [];
          for (let i = 0; i <= duration; i++) {
            const tDate = new Date(dateStr);
            tDate.setDate(tDate.getDate() + i);
            const tDateStr = tDate.toISOString().split('T')[0];
            tripDays.push(tDateStr);
          }

          const tripData = {
            startDate: tripDays[0],
            endDate: tripDays[tripDays.length - 1],
            destination: ['Hà Nội', 'Đà Nẵng', 'Hồ Chí Minh', 'Cần Thơ'][Math.floor(Math.random() * 4)],
            purpose: 'Họp đối tác & Khảo sát thị trường'
          };

          applicationsToInsert.push({
            type: 'business-trip',
            status: 1,
            userId: userId,
            data: JSON.stringify(tripData),
            created_at: new Date(dateStr),
            updated_at: new Date(dateStr)
          });

          for (const td of tripDays) {
            PLANNED_TRIP.set(`${userId}-${td}`, tripData);
          }
          continue;
        }

        // 3. OVERTIME
        let otPlan = null;
        if (isHol) {
          if (Math.random() < 0.15) {
            otPlan = {
              date: dateStr,
              startTime: '08:00',
              endTime: '17:00',
              totalHours: 8,
              reason: `Trực lễ ${HOLIDAY_NAMES.get(dateStr)}`
            };
          }
        }
        else if (isWknd) {
          if (Math.random() < 0.08) {
            otPlan = {
              date: dateStr,
              startTime: '08:00',
              endTime: '17:00',
              totalHours: 8,
              reason: 'Làm bù dự án'
            };
          }
        }
        else if (isWeekday) {
          if (Math.random() < otChance) {
            const duration = 1.0 + Math.random() * 3;
            const endH = 17 + Math.floor(duration);
            const endM = Math.floor((duration % 1) * 60);
            const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

            otPlan = {
              overtimeDate: dateStr,
              startTime: '17:00',
              endTime: endTimeStr,
              overtimeHours: Number(duration.toFixed(1)),
              reason: 'Hoàn thành báo cáo'
            };
          }
        }

        if (otPlan) {
          PLANNED_OT.set(`${userId}-${dateStr}`, otPlan);
          applicationsToInsert.push({
            type: 'overtime',
            status: 1,
            userId: userId,
            data: JSON.stringify(otPlan),
            created_at: new Date(dateStr),
            updated_at: new Date(dateStr)
          });
        }
      }
    }
  }

  // Batch Insert Apps
  console.log(`   📝 Inserting ${applicationsToInsert.length} Synced OT Applications...`);

  // CLEANUP: Delete OLD applications in the seed range to fix the "33 apps" issue
  // We delete ALL OT and Leave apps in the target months to ensure consistency.
  console.log('   🧹 Clearing old applications (OT & Leave) in seed range...');
  await appKnex('applications')
    .whereIn('type', ['overtime', 'leave', 'sick-leave', 'unpaid_leave', 'business-trip'])
    .andWhereRaw("data ->> 'date' >= '2025-10-01' OR data ->> 'startDate' >= '2025-10-01'")
    .del();

  // Insert Synced OT Apps
  const CHUNK_SIZE = 500;
  for (let i = 0; i < applicationsToInsert.length; i += CHUNK_SIZE) {
    const chunk = applicationsToInsert.slice(i, i + CHUNK_SIZE);
    await appKnex('applications').insert(chunk).onConflict(['id']).ignore();
  }

  // SEED SAMPLE LEAVE APPS (User 1 & User 3)
  // User 1 (Admin) - Existing test cases
  const leaveAppsToInsert = [
    {
      type: 'leave', // Paid Leave
      status: 1,
      userId: 1, // Admin
      data: JSON.stringify({
        startDate: '2026-02-03',
        endDate: '2026-02-03',
        reason: 'Nghỉ phép năm (Test Seed)',
        isPaid: true
      }),
      created_at: new Date('2026-02-01'),
      updated_at: new Date('2026-02-01')
    },
    {
      type: 'unpaid_leave', // Unpaid Leave
      status: 1,
      userId: 1, // Admin
      data: JSON.stringify({
        startDate: '2026-02-10',
        endDate: '2026-02-10',
        reason: 'Nghỉ không lương (Test Seed)',
        leaveType: 'unpaid',
        isPaid: false
      }),
      created_at: new Date('2026-02-01'),
      updated_at: new Date('2026-02-01')
    },
    // User 3 (toanhm) - Requested Test Cases
    {
      type: 'unpaid_leave', // Changed to Unpaid as per user request ("đều là nghỉ không lương")
      status: 1,
      userId: 3, // toanhm
      data: JSON.stringify({
        startDate: '2026-02-11',
        endDate: '2026-02-11',
        reason: 'Nghỉ thường', // User term
        leaveType: 'unpaid',
        isPaid: false
      }),
      created_at: new Date('2026-02-05'),
      updated_at: new Date('2026-02-05')
    },
    {
      type: 'unpaid_leave', // Changed to Unpaid
      status: 1,
      userId: 3, // toanhm
      data: JSON.stringify({
        startDate: '2026-02-27',
        endDate: '2026-02-28',
        reason: 'Nghỉ thường', // User term
        leaveType: 'unpaid',
        isPaid: false
      }),
      created_at: new Date('2026-02-25'),
      updated_at: new Date('2026-02-26')
    },
    {
      type: 'business-trip',
      status: 1, // Approved
      userId: 1, // Admin (Existing User)
      data: JSON.stringify({
        startDate: '2026-01-15',
        endDate: '2026-01-17',
        reason: 'Công tác tại chi nhánh Hà Nội',
        location: 'Hà Nội'
      }),
      created_at: new Date('2026-01-10'),
      updated_at: new Date('2026-01-10')
    },
    {
      type: 'business-trip',
      status: 1, // Approved
      userId: 3, // toanhm
      data: JSON.stringify({
        startDate: '2026-02-20',
        endDate: '2026-02-22',
        reason: 'Tham dự hội thảo công nghệ',
        location: 'Đà Nẵng'
      }),
      created_at: new Date('2026-02-15'),
      updated_at: new Date('2026-02-15')
    }
  ];

  // REGISTER HARDCODED APPS TO MAPS SO ATTENDANCE LOGIC RESPECTS THEM
  for (const app of leaveAppsToInsert) {
    const data = JSON.parse(app.data);
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    let iter = new Date(startDate);
    while (iter <= endDate) {
      const dateStr = iter.toISOString().split('T')[0];
      const key = `${app.userId}-${dateStr}`;

      if (app.type === 'business-trip') {
        PLANNED_TRIP.set(key, data);
      } else {
        PLANNED_LEAVE.set(key, { ...data, type: app.type });
      }
      iter.setDate(iter.getDate() + 1);
    }
  }

  // Insert Sample Leave/Trip Apps
  await appKnex('applications').insert(leaveAppsToInsert).onConflict(['id']).ignore();
  await appKnex.destroy();


  // =============================================
  // STEP 2: Clear & Seed Attendance (Synced)
  // =============================================
  console.log('\n🗑️  Cleaning old attendance (Oct 2025 - Feb 2026)...');
  await knex('time_attendances')
    .whereRaw("date >= '2025-10-01' AND date <= '2026-02-28'")
    .del();
  await knex('monthly_attendances')
    .whereIn('month', ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02'])
    .del();

  let batch = [];
  const BATCH_SIZE = 500;
  const leaveMap = new Map(); // Assuming empty for now or fetch if needed (skipping fetch for speed/focus on OT)

  console.log('🏗️  Generating Time Attendance Records (Realistic)...');

  for (const m of months) {
    const daysInMonth = new Date(m.year, m.month, 0).getDate();

    for (const userId of userIds) {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${m.year}-${String(m.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dateStr > '2026-02-28') continue;

        const isHol = HOLIDAYS_SET.has(dateStr);
        const dayOfWeek = new Date(dateStr).getDay();
        const isWknd = (dayOfWeek === 0 || dayOfWeek === 6);
        const isWeekday = !isHol && !isWknd;

        const appKey = `${userId}-${dateStr}`;
        const leavePlan = PLANNED_LEAVE.get(appKey);
        const tripPlan = PLANNED_TRIP.get(appKey);
        const otPlan = PLANNED_OT.get(appKey);

        let record = {
          userId,
          date: dateStr,
          checkInTime: null,
          checkOutTime: null,
          dailyTotalWorkHours: 0,
          dailyWorkingUnit: 0,
          totalWorkingUnit: 0,
          otWorkingUnit: 0,
          overtimeHours: 0,
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          lateArrivalPenalty: 0,
          earlyLeavePenalty: 0,
          created_at: new Date(),
          updated_at: new Date()
        };

        // ---------------------------------------------------------
        // LOGIC: ATTENDANCE MATCHES PLANS
        // ---------------------------------------------------------

        // CASE 0: Leave Day -> Skip record (Monthly report handles absence/leave)
        if (leavePlan) continue;

        // CASE 0.5: Business Trip -> Standard 8h record
        if (tripPlan) {
          record.checkInTime = `${dateStr}T08:00:00+07:00`;
          record.checkOutTime = `${dateStr}T17:00:00+07:00`;
          record.dailyTotalWorkHours = 8;
          record.dailyWorkingUnit = 1.0;
          record.totalWorkingUnit = 1.0;
          batch.push(record);
          continue;
        }

        // CASE 1: Has Planned OT (Holiday/Weekend/Weekday Evening)
        if (otPlan) {
          // Must have check-in/out to justify the OT
          let inTime = otPlan.startTime + ':00'; // e.g. 08:00:00 or 17:00:00?
          let outTime = otPlan.endTime + ':00';  // e.g. 17:00:00 or 19:30:00

          // If Full Day OT (Holiday/Weekend) -> Start ~08:00, End ~17:00
          if ((isHol || isWknd) && otPlan.totalHours >= 8) {
            // Add minor variance (come a bit early, leave a bit late)
            // Random e.g. 07:45 - 08:00
            const varIn = Math.floor(Math.random() * 15);
            inTime = `07:${String(45 + varIn).padStart(2, '0')}:00`;

            // End ~17:00 + variance
            outTime = getRandomTime(17, 0, 10);

            record.dailyTotalWorkHours = 8;
            record.overtimeHours = 8;
            // Units
            const otRate = isHol ? 3.0 : 1.5;
            record.otWorkingUnit = otRate;
            record.totalWorkingUnit = otRate;
          }
          // If Weekday Evening OT -> Normal Work (8-17) + Extra
          else if (isWeekday) {
            // Normal Check-in (Varied)
            inTime = getRandomTime(8, 0, 20); // 07:40 - 08:20
            if (inTime > '08:00:00') {
              // Calculate late logic later if needed
              // For OT purity, let's assume they checked in reasonably
              inTime = getRandomTime(7, 55, 5); // 07:50 - 08:00 safe
            }

            // Check-out MUST covers OT
            // OT end is otPlan.endTime. Let's make actual checkout slightly AFTER that.
            const planEnd = otPlan.endTime; // "19:30"
            const [h, min] = planEnd.split(':').map(Number);
            // checkout = planEnd + random(0-15 mins)
            const dOut = new Date(2000, 0, 1, h, min);
            dOut.setMinutes(dOut.getMinutes() + Math.floor(Math.random() * 15));
            outTime = `${String(dOut.getHours()).padStart(2, '0')}:${String(dOut.getMinutes()).padStart(2, '0')}:00`;

            // Calculate standard hours (8) + OT hours
            record.dailyTotalWorkHours = 8; // Standard filled
            const otHrs = otPlan.overtimeHours || otPlan.totalHours || 0;
            record.overtimeHours = otHrs;

            record.dailyWorkingUnit = 1.0; // Standard day OK
            record.otWorkingUnit = (otHrs / 8) * 1.5; // Rate 1.5
            record.totalWorkingUnit = record.dailyWorkingUnit + record.otWorkingUnit;
          }

          record.checkInTime = `${dateStr}T${inTime}+07:00`;
          record.checkOutTime = `${dateStr}T${outTime}+07:00`;
        }

        // CASE 2: No OT, Standard Weekday
        else if (isWeekday) {
          // 90% Present (High attendance)
          if (Math.random() < 0.90) {

            // --- TIME GENERATION LOGIC (SAFER) ---
            let inTime, outTime;
            let lateM = 0;
            let earlyLeaveM = 0;

            // CHECK-IN RANDOMIZATION
            // 90% On Time (07:30 - 07:55) -> SAFE ZONE
            // 10% Late (08:15 - 09:00) -> OBVIOUS PENALTY
            if (Math.random() < 0.90) {
              // ON TIME: 07:30 to 07:55
              const mm = 30 + Math.floor(Math.random() * 26);
              inTime = `07:${String(mm).padStart(2, '0')}:00`;
              lateM = 0;
              record.lateArrivalPenalty = 0;
            } else {
              // LATE: 08:15 to 09:00 (Max 08:59)
              const mm = 15 + Math.floor(Math.random() * 45); // Max 15+44 = 59
              inTime = `08:${String(mm).padStart(2, '0')}:00`;
              lateM = mm; // Minutes past 08:00
              record.lateArrivalPenalty = lateM * 1000;
            }

            // CHECK-OUT RANDOMIZATION
            // 90% On Time (17:05 - 17:45) -> SAFE ZONE
            // 10% Early (16:00 - 16:45) -> OBVIOUS PENALTY
            if (Math.random() < 0.90) {
              // ON TIME: 17:05 to 17:45
              const mm = 5 + Math.floor(Math.random() * 41);
              outTime = `17:${String(mm).padStart(2, '0')}:00`;
              earlyLeaveM = 0;
              record.earlyLeavePenalty = 0;
            } else {
              // EARLY: 16:00 to 16:45
              const mm = Math.floor(Math.random() * 46);
              outTime = `16:${String(mm).padStart(2, '0')}:00`;
              // Early minutes = 17:00 - 16:mm
              earlyLeaveM = 60 - mm;
              record.earlyLeavePenalty = earlyLeaveM * 1000;
            }

            record.lateMinutes = lateM;
            record.earlyDepartureMinutes = earlyLeaveM;

            record.checkInTime = `${dateStr}T${inTime}+07:00`;
            record.checkOutTime = `${dateStr}T${outTime}+07:00`;

            // CALC EFFECTIVE WORK HOURS (Standard 8h - Penalty)
            let h = 8 - (lateM / 60) - (earlyLeaveM / 60);
            if (h < 0) h = 0;

            // Round to 2 decimal places for neatness
            record.dailyTotalWorkHours = Math.round(h * 100) / 100;

            // WORKING UNITS (Simpler Logic)
            if (h >= 7.0) {
              record.dailyWorkingUnit = 1.0;
            } else if (h >= 3.5) {
              record.dailyWorkingUnit = 0.5;
            } else {
              record.dailyWorkingUnit = 0;
            }

            record.totalWorkingUnit = record.dailyWorkingUnit;
          }
        }

        // CASE 3: Holiday/Weekend with No OT -> No Attendance (null)

        batch.push(record);
        if (batch.length >= BATCH_SIZE) {
          await knex('time_attendances').insert(batch).onConflict('id').ignore();
          batch = [];
        }
      }
    }
  }

  if (batch.length > 0) {
    await knex('time_attendances').insert(batch).onConflict('id').ignore();
  }
  console.log('   ✅ Inserted Time Attendances.');

  // =============================================
  // STEP 3: Monthly Aggregation
  // =============================================
  console.log('📊 Calculating Monthly Aggregates...');
  const aggregatorSQL = `
    INSERT INTO monthly_attendances (
      "userId", "month", "totalWorkingUnits", "totalOtWorkingUnits", 
      "totalWorkHours", "totalOvertimeHours", "presentDays", "lateDays", 
      "earlyLeaveDays", "totalLateMinutes", "totalEarlyLeaveMinutes", 
      "created_at", "updated_at"
    )
    SELECT 
      "userId",
      to_char("date", 'YYYY-MM'),
      SUM(COALESCE("totalWorkingUnit", 0)),
      SUM(COALESCE("otWorkingUnit", 0)),
      SUM(COALESCE("dailyTotalWorkHours", 0)),
      SUM(COALESCE("overtimeHours", 0)),
      COUNT(CASE WHEN "checkInTime" IS NOT NULL THEN 1 END),
      COUNT(CASE WHEN "lateMinutes" > 0 THEN 1 END),
      COUNT(CASE WHEN "earlyDepartureMinutes" > 0 THEN 1 END),
      SUM(COALESCE("lateMinutes", 0)),
      SUM(COALESCE("earlyDepartureMinutes", 0)),
      NOW(), NOW()
    FROM time_attendances
    WHERE date >= '2025-10-01' AND date <= '2026-02-28'
    GROUP BY "userId", to_char("date", 'YYYY-MM')
  `;
  await knex.raw(aggregatorSQL);
  console.log('   ✅ Monthly Aggregates Calculated.');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY.');
};
