/**
 * SEED: November 2025 - Complete Attendance with OT, Leave, Business Trip
 * Bao gồm: OT ngày thường, nghỉ phép, nghỉ không phép, công tác
 * Working hours: 09:00-18:00, Lunch: 12:00-13:00
 * Chỉ tạo đến ngày 14/11 (hôm nay)
 */

exports.seed = async function(knex) {
  console.log('\n📅 Seeding November 2025 attendance (up to Nov 14, FULL scenarios)...\n');
  
  await knex('time_attendances')
    .whereBetween('date', ['2025-11-01', '2025-11-30'])
    .del();

  const attendances = [];
  const today = 14; // Nov 14
  
  const workingDays = [];
  for (let day = 1; day <= today; day++) {
    const date = new Date(2025, 10, day);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) workingDays.push(day);
  }

  console.log(`   Working days (up to Nov ${today}): ${workingDays.length} days`);

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

  const getEmployeeType = (userId) => {
    const r = (userId * 7) % 100;
    if (r < 15) return 'often_late';
    if (r < 75) return 'average';
    return 'punctual';
  };

  // Define November scenarios
  const specialDays = {
    // User 4: OT (Nov 5, 10), nghỉ phép (Nov 11-12)
    4: { ot: [5, 10], leave: [11, 12] },
    // User 6: Công tác (Nov 6-8)
    6: { businessTrip: [6, 7, 8] },
    // User 8: Nghỉ không phép (Nov 4)
    8: { absent: [4] },
    // User 12: Nghỉ phép (Nov 13-14)
    12: { leave: [13, 14] },
    // User 14: OT nhiều (Nov 3, 7, 11)
    14: { ot: [3, 7, 11] },
    // User 16: Nghỉ không phép (Nov 9)
    16: { absent: [9] },
    // User 20: Công tác (Nov 4-5)
    20: { businessTrip: [4, 5] }
  };

  let totalRecords = 0;

  for (let userId = 2; userId <= 101; userId++) {
    const empType = getEmployeeType(userId);
    const special = specialDays[userId] || {};
    
    for (const day of workingDays) {
      const date = new Date(2025, 10, day);
      
      if (special.absent && special.absent.includes(day)) continue;
      if (special.leave && special.leave.includes(day)) continue;
      if (special.businessTrip && special.businessTrip.includes(day)) continue;

      let checkInOffset = 0;
      if (empType === 'often_late') checkInOffset = 15 + Math.floor(Math.random() * 60);
      else if (empType === 'average') checkInOffset = Math.floor(Math.random() * 30);
      else checkInOffset = -10 + Math.floor(Math.random() * 15);

      const checkInMin = 9 * 60 + checkInOffset;
      const checkIn = new Date(2025, 10, day, Math.floor(checkInMin / 60), checkInMin % 60, 0);

      let checkOutMin = 18 * 60;
      
      if (special.ot && special.ot.includes(day)) {
        checkOutMin += 60 + Math.floor(Math.random() * 120);
      } else {
        if (empType === 'punctual') checkOutMin += Math.floor(Math.random() * 30);
        else if (empType === 'average') checkOutMin += -15 + Math.floor(Math.random() * 30);
        else checkOutMin += -30 + Math.floor(Math.random() * 20);
      }

      const checkOut = new Date(2025, 10, day, Math.floor(checkOutMin / 60), checkOutMin % 60, 0);

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

  for (let i = 0; i < attendances.length; i += 500) {
    const batch = attendances.slice(i, i + 500);
    await knex('time_attendances').insert(batch);
  }

  console.log(`   ✅ Created ${totalRecords} attendance records`);
  console.log(`\n✅ November 2025 seed completed (up to Nov ${today})!\n`);
};
