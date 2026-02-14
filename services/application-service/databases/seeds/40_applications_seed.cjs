// SEED: Don tu Oct/Nov/Dec 2025 + Jan/Feb 2026 (100 Employees)
// Format dữ liệu tiêu chuẩn (giống FE tạo)
// - OT: { reason, startTime (ISO), endTime (ISO), overtimeDate (ISO), overtimeHours }
// - Leave: { reason, startDate (ISO), endDate (ISO), leaveType, applicationCategory }
// - Business Trip: { reason, startDate (ISO), endDate (ISO), location, destination }

exports.seed = async function (knex) {
  console.log('\n' + '='.repeat(70));
  console.log('SEED: Don tu Oct/Nov/Dec 2025 + Jan/Feb 2026');
  console.log('Format: Tiêu chuẩn FE (ISO dates)');
  console.log('='.repeat(70));

  // Xoa du lieu cu
  await knex('applications')
    .whereRaw("created_at >= '2025-10-01' AND created_at <= '2026-02-28'")
    .del();
  console.log('\nDa xoa du lieu cu');

  // ===== HELPER FUNCTIONS =====

  // Kiem tra ngay lam viec
  const isWorkingDay = (year, month, day) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  };

  // Lay ngay lam viec trong thang
  const getWorkingDays = (year, month, maxDay) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = maxDay ? Math.min(maxDay, daysInMonth) : daysInMonth;
    const workingDays = [];
    for (let day = 1; day <= lastDay; day++) {
      if (isWorkingDay(year, month, day)) {
        workingDays.push(day);
      }
    }
    return workingDays;
  };

  // Tạo ISO date string từ year/month/day với giờ 17:00:00 UTC+7 = 10:00:00 UTC
  // Frontend gửi date dạng ISO, ví dụ: "2026-02-04T17:00:00.000Z" 
  // (đây là 00:00 ngày 5/2 UTC+7 hoặc 17:00 ngày 4/2 UTC)
  // Để đơn giản, ta dùng format YYYY-MM-DDT17:00:00.000Z (tức 00:00 ngày hôm sau ở VN)
  const toISODate = (year, month, day) => {
    // Tạo date ở timezone UTC+7 = ngày đó 00:00 VN = ngày trước đó 17:00 UTC
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}T17:00:00.000Z`;
  };

  // Tạo ISO datetime string cho giờ OT (VN timezone -> UTC)
  // Ví dụ: startTime 17:00 VN = 10:00 UTC
  const toISOTime = (year, month, day, hour, minute) => {
    const utcHour = hour - 7;
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dAdjust = utcHour < 0 ? String(day - 1).padStart(2, '0') : d;
    const hourAdjust = utcHour < 0 ? utcHour + 24 : utcHour;
    return `${y}-${m}-${dAdjust}T${String(hourAdjust).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
  };

  const applications = [];

  // Cac thang can seed
  const months = [
    { year: 2025, month: 9, name: 'October 2025', maxDay: null },
    { year: 2025, month: 10, name: 'November 2025', maxDay: null },
    { year: 2025, month: 11, name: 'December 2025', maxDay: null },
    { year: 2026, month: 0, name: 'January 2026', maxDay: 22 },
    { year: 2026, month: 1, name: 'February 2026', maxDay: null }
  ];

  let stats = { leave: 0, businessTrip: 0, overtime: 0, totalLeaveDays: 0, totalTripDays: 0 };

  // Ly do nghi phep
  const leaveReasonsPaid = ['Nghi phep nam', 'Nghi cuoi', 'Nghi phep theo quy dinh'];
  const leaveReasonsRegular = ['Nghi viec rieng', 'Nghi khong luong'];
  const leaveReasonsSick = ['Nghi om', 'Kham benh', 'Cham soc nguoi than om'];

  // OT reasons
  const otReasons = ['Hoan thanh deadline', 'Xu ly cong viec ton dong', 'Du an gap', 'Ho tro team', 'Fix bug khan cap'];

  // Dia diem cong tac
  const tripDestinations = ['Ha Noi', 'Da Nang', 'Can Tho', 'Hai Phong', 'Binh Duong', 'Nha Trang', 'Hue', 'Vung Tau'];
  const tripPurposes = ['Hop voi khach hang', 'Khao sat du an moi', 'Dao tao chi nhanh', 'Trien khai he thong', 'Hoi thao nganh', 'Kiem tra tien do du an'];

  for (const { year, month, name, maxDay } of months) {
    const workingDays = getWorkingDays(year, month, maxDay);
    const daysInMonth = maxDay || new Date(year, month + 1, 0).getDate();
    console.log('\n' + name + ': ' + workingDays.length + ' ngay lam viec');

    for (let userId = 1; userId <= 100; userId++) {
      const usedDays = new Set();

      // Random so luong don tu
      const numLeave = Math.floor(Math.random() * 3);
      const numTrip = Math.floor(Math.random() * 2);
      const numOT = Math.floor(Math.random() * 3);

      // ===== DON NGHI PHEP =====
      for (let i = 0; i < numLeave; i++) {
        let startDay;
        let attempts = 0;
        do {
          startDay = workingDays[Math.floor(Math.random() * workingDays.length)];
          attempts++;
        } while (usedDays.has(startDay) && attempts < 30);

        if (!usedDays.has(startDay)) {
          const duration = Math.random() > 0.7 ? (Math.random() > 0.5 ? 3 : 2) : 1;

          let endDay = startDay;
          let actualDays = 1;

          for (let d = 1; d < duration; d++) {
            const nextDay = startDay + d;
            if (nextDay <= daysInMonth && !usedDays.has(nextDay)) {
              endDay = nextDay;
              actualDays++;
              usedDays.add(nextDay);
            }
          }
          usedDays.add(startDay);

          // Format tiêu chuẩn: ISO dates
          const startDateISO = toISODate(year, month, startDay);
          const endDateISO = toISODate(year, month, endDay);

          // Random loai nghi: paid (60%), regular/unpaid (30%), sick (10%)
          const rand = Math.random();
          let leaveType, applicationCategory, reasons;
          if (rand < 0.6) {
            leaveType = 'personal';
            applicationCategory = 'paid';
            reasons = leaveReasonsPaid;
          } else if (rand < 0.9) {
            leaveType = 'personal';
            applicationCategory = 'regular';
            reasons = leaveReasonsRegular;
          } else {
            leaveType = 'sick';
            applicationCategory = 'paid';
            reasons = leaveReasonsSick;
          }

          const reason = reasons[Math.floor(Math.random() * reasons.length)];

          applications.push({
            type: 'leave',
            status: 1, // approved
            data: JSON.stringify({
              reason: reason,
              leaveType: leaveType,
              applicationCategory: applicationCategory,
              startDate: startDateISO,
              endDate: endDateISO
            }),
            userId: userId,
            approvedBy: 2,
            approvedDate: new Date(year, month, Math.max(1, startDay - 1)),
            created_at: new Date(year, month, Math.max(1, startDay - 2)),
            updated_at: new Date(year, month, Math.max(1, startDay - 1))
          });
          stats.leave++;
          stats.totalLeaveDays += actualDays;
        }
      }

      // ===== DON CONG TAC =====
      for (let i = 0; i < numTrip; i++) {
        let startDay;
        let attempts = 0;
        do {
          startDay = workingDays[Math.floor(Math.random() * workingDays.length)];
          attempts++;
        } while (usedDays.has(startDay) && attempts < 30);

        if (!usedDays.has(startDay)) {
          const duration = Math.random() > 0.6
            ? (Math.random() > 0.5 ? (Math.floor(Math.random() * 3) + 3) : 2)
            : 1;

          const endDay = Math.min(startDay + duration - 1, daysInMonth);
          const actualDays = endDay - startDay + 1;

          for (let d = startDay; d <= endDay; d++) {
            usedDays.add(d);
          }

          // Format tiêu chuẩn: ISO dates
          const startDateISO = toISODate(year, month, startDay);
          const endDateISO = toISODate(year, month, endDay);

          const destination = tripDestinations[Math.floor(Math.random() * tripDestinations.length)];
          const purpose = tripPurposes[Math.floor(Math.random() * tripPurposes.length)];

          applications.push({
            type: 'business-trip',
            status: 1,
            data: JSON.stringify({
              reason: purpose,
              startDate: startDateISO,
              endDate: endDateISO,
              location: 'TP.HCM',
              destination: destination
            }),
            userId: userId,
            approvedBy: 2,
            approvedDate: new Date(year, month, Math.max(1, startDay - 1)),
            created_at: new Date(year, month, Math.max(1, startDay - 3)),
            updated_at: new Date(year, month, Math.max(1, startDay - 1))
          });
          stats.businessTrip++;
          stats.totalTripDays += actualDays;
        }
      }

      // ===== DON OT =====
      for (let i = 0; i < numOT; i++) {
        let otDay;
        let attempts = 0;
        // OT có thể vào ngày nghỉ hoặc ngày làm việc
        const allDays = Array.from({ length: daysInMonth }, (_, x) => x + 1);
        do {
          otDay = allDays[Math.floor(Math.random() * allDays.length)];
          attempts++;
        } while (usedDays.has(otDay) && attempts < 30);

        if (!usedDays.has(otDay)) {
          usedDays.add(otDay);

          const isWeekend = !isWorkingDay(year, month, otDay);

          // Giờ OT
          let startHour, startMinute, overtimeHours;
          if (isWeekend) {
            // Cuối tuần: làm từ 08:00, 4-8 tiếng
            startHour = 8;
            startMinute = 0;
            overtimeHours = [4, 6, 8][Math.floor(Math.random() * 3)];
          } else {
            // Ngày thường: làm thêm sau 17:00, 1-4 tiếng
            startHour = 17;
            startMinute = 0;
            overtimeHours = [1, 2, 3, 4][Math.floor(Math.random() * 4)];
          }

          // Tính endTime: cộng overtimeHours + 1h nghỉ trưa nếu vượt qua 12:00-13:00
          let endHour = startHour + overtimeHours;
          let endMinute = startMinute;
          // Nếu khoảng OT bao gồm giờ nghỉ trưa (12:00-13:00), cộng thêm 1h
          if (startHour < 12 && endHour >= 12) {
            endHour += 1; // Cộng 1h nghỉ trưa
          }

          const overtimeDateISO = toISODate(year, month, otDay);
          const startTimeISO = toISOTime(year, month, otDay, startHour, startMinute);
          const endTimeISO = toISOTime(year, month, otDay, endHour, endMinute);

          const reason = otReasons[Math.floor(Math.random() * otReasons.length)];

          applications.push({
            type: 'overtime',
            status: 1,
            data: JSON.stringify({
              reason: reason,
              startTime: startTimeISO,
              endTime: endTimeISO,
              overtimeDate: overtimeDateISO,
              overtimeHours: overtimeHours
            }),
            userId: userId,
            approvedBy: 2,
            approvedDate: new Date(year, month, Math.max(1, otDay - 1)),
            created_at: new Date(year, month, Math.max(1, otDay - 2)),
            updated_at: new Date(year, month, Math.max(1, otDay - 1))
          });
          stats.overtime++;
        }
      }
    }
  }

  // Insert theo batch - dùng raw query để tránh conflict với auto-increment ID
  console.log('\nDang insert du lieu... (' + applications.length + ' don)');

  // Reset sequence trước khi insert
  const maxIdResult = await knex('applications').max('id as maxId').first();
  const currentMaxId = maxIdResult?.maxId || 0;

  for (let i = 0; i < applications.length; i += 100) {
    const batch = applications.slice(i, i + 100);
    await knex('applications').insert(batch);
  }

  // Fix sequence sau khi insert
  const newMaxResult = await knex('applications').max('id as maxId').first();
  const newMaxId = newMaxResult?.maxId || 0;
  await knex.raw(`SELECT setval('applications_id_seq', ${newMaxId + 1}, false)`);

  console.log('\n' + '='.repeat(70));
  console.log('HOAN THANH SEED DON TU!');
  console.log('  Tong: ' + applications.length + ' don tu');
  console.log('  Nghi phep: ' + stats.leave + ' don (' + stats.totalLeaveDays + ' ngay)');
  console.log('  Cong tac: ' + stats.businessTrip + ' don (' + stats.totalTripDays + ' ngay)');
  console.log('  Tang ca: ' + stats.overtime + ' don');
  console.log('='.repeat(70));
};
