/**
 * SEED: October 2025 - Complete Attendance with OT, Leave, Business Trip
 * Bao gồm: OT ngày thường, OT ngày lễ, nghỉ phép, nghỉ không phép, công tác, công tác ngày lễ
 * Working hours: 09:00-18:00, Lunch: 12:00-13:00
 */

exports.seed = async function(knex) {
  console.log('\n📅 Seeding October 2025 attendance (FULL scenarios)...\n');
  
  await knex('time_attendances')
    .whereBetween('date', ['2025-10-01', '2025-10-31'])
    .del();

  const attendances = [];
  
  // Working days in October 2025
  const workingDays = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 9, day); // month 9 = October
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) workingDays.push(day);
  }

  console.log(`   Working days: ${workingDays.length} days`);

  // Helper: Calculate work hours (09:00-18:00, lunch 12-13)
  const calcWorkHours = (checkIn, checkOut) => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const lunchStart = new Date(ci); lunchStart.setHours(12,0,0,0);
    const lunchEnd = new Date(ci); lunchEnd.setHours(13,0,0,0);
    const totalMin = (co - ci) / (1000 * 60);
    const overlapStart = Math.max(ci.getTime(), lunchStart.getTime());
    const overlapEnd = Math.min(co.getTime(), lunchEnd.getTime());
    const lunchMin = overlapEnd > overlapStart ? (overlapEnd - overlapStart) / (1000 * 60) : 0;
    return Math.max(0, Math.round((totalMin - lunchMin) / 60 * 100) / 100);
  };

  const calcLate = (checkIn) => {
    const ci = new Date(checkIn);
    const std = new Date(ci); std.setHours(9,0,0,0);
    return ci > std ? Math.floor((ci - std) / (1000 * 60)) : 0;
  };

  const calcEarly = (checkOut) => {
    const co = new Date(checkOut);
    const std = new Date(co); std.setHours(18,0,0,0);
    return co < std ? Math.floor((std - co) / (1000 * 60)) : 0;
  };

  // Assign employee types for variation
  const getEmployeeType = (userId) => {
    const r = (userId * 7) % 100;
    if (r < 15) return 'often_late';
    if (r < 75) return 'average';
    return 'punctual';
  };

  // Define scenarios (userId -> special days)
  const specialDays = {
    // User 3: OT ngày thường (Oct 10), nghỉ phép (Oct 15-17)
    3: { ot: [10], leave: [15, 16, 17] },
    // User 5: Công tác (Oct 8-10), OT ngày lễ (Oct 1)
    5: { businessTrip: [8, 9, 10], otHoliday: [1] },
    // User 7: Nghỉ không phép (Oct 12, 14)
    7: { absent: [12, 14] },
    // User 11: Công tác ngày lễ (Oct 1-2)
    11: { businessTripHoliday: [1, 2] },
    // User 13: Nghỉ phép (Oct 20-22)
    13: { leave: [20, 21, 22] },
    // User 17: OT ngày thường nhiều (Oct 5, 10, 15, 20, 25)
    17: { ot: [5, 10, 15, 20, 25] },
    // User 19: Nghỉ không phép (Oct 18)
    19: { absent: [18] }
  };

  // October 2025 holidays: Oct 1-2 (Quốc khánh 2/9 observed)
  const holidays = new Set([1, 2]);

  let totalRecords = 0;

  for (let userId = 2; userId <= 101; userId++) {
    const empType = getEmployeeType(userId);
    const special = specialDays[userId] || {};
    
    for (const day of workingDays) {
      const date = new Date(2025, 9, day);
      const isHoliday = holidays.has(day);
      
      // Skip if absent
      if (special.absent && special.absent.includes(day)) continue;
      
      // Skip if on leave (will be handled by application seed)
      if (special.leave && special.leave.includes(day)) continue;
      
      // Skip if business trip (will be handled by application seed)
      if (special.businessTrip && special.businessTrip.includes(day)) continue;
      if (special.businessTripHoliday && special.businessTripHoliday.includes(day)) continue;

      // Random check-in based on type
      let checkInOffset = 0; // minutes after 09:00
      if (empType === 'often_late') checkInOffset = 15 + Math.floor(Math.random() * 60);
      else if (empType === 'average') checkInOffset = Math.floor(Math.random() * 30);
      else checkInOffset = -10 + Math.floor(Math.random() * 15);

      const checkInMin = 9 * 60 + checkInOffset;
      const checkIn = new Date(2025, 9, day, Math.floor(checkInMin / 60), checkInMin % 60, 0);

      // Check-out: default 18:00, with OT if applicable
      let checkOutMin = 18 * 60;
      
      // Add OT if scheduled
      if (special.ot && special.ot.includes(day)) {
        checkOutMin += 60 + Math.floor(Math.random() * 120); // OT 1-3h
      } else if (special.otHoliday && special.otHoliday.includes(day)) {
        checkOutMin += 120 + Math.floor(Math.random() * 120); // OT 2-4h on holiday
      } else {
        // Random variance
        if (empType === 'punctual') checkOutMin += Math.floor(Math.random() * 30);
        else if (empType === 'average') checkOutMin += -15 + Math.floor(Math.random() * 30);
        else checkOutMin += -30 + Math.floor(Math.random() * 20);
      }

      const checkOut = new Date(2025, 9, day, Math.floor(checkOutMin / 60), checkOutMin % 60, 0);

      const workHours = calcWorkHours(checkIn, checkOut);
      const lateMin = calcLate(checkIn);
      const earlyMin = calcEarly(checkOut);

      attendances.push({
        userId,
        date,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        dailyTotalWorkHours: workHours,
        lateMinutes: lateMin,
        earlyDepartureMinutes: earlyMin,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      totalRecords++;
    }
  }

  // Insert in batches
  for (let i = 0; i < attendances.length; i += 500) {
    const batch = attendances.slice(i, i + 500);
    await knex('time_attendances').insert(batch);
  }

  console.log(`   ✅ Created ${totalRecords} attendance records`);
  console.log(`\n✅ October 2025 seed completed!\n`);
};
