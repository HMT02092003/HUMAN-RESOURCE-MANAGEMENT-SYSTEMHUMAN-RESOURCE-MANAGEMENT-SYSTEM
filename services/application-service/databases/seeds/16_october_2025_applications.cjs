/**
 * Seed: October 2025 Applications (100 Employees)
 */

exports.seed = async function(knex) {
  await knex('applications').where('created_at', '>=', '2025-10-01').where('created_at', '<=', '2025-10-31').del();
  
  const workingDays = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 9, day);
    if (date.getDay() !== 0 && date.getDay() !== 6) workingDays.push(day);
  }

  const applications = [];
  for (let userId = 2; userId <= 101; userId++) {
    const numLeave = Math.floor(Math.random() * 4);
    const numTrip = Math.floor(Math.random() * 3);
    const numOT = Math.floor(Math.random() * 6);
    const usedDays = [];

    for (let i = 0; i < numLeave; i++) {
      let day;
      do { day = workingDays[Math.floor(Math.random() * workingDays.length)]; } while (usedDays.includes(day));
      usedDays.push(day);
      applications.push({
        type: 'leave',
        status: 1,
        data: JSON.stringify({ reason: 'Nghỉ phép năm', startDate: `2025-10-${String(day).padStart(2,'0')}`, endDate: `2025-10-${String(day).padStart(2,'0')}`, totalDays: 1 }),
        userId, approvedBy: 2, approvedDate: new Date(2025, 9, day - 1),
        created_at: new Date(2025, 9, day - 2), updated_at: new Date(2025, 9, day - 1)
      });
    }

    for (let i = 0; i < numTrip; i++) {
      let day;
      do { day = workingDays[Math.floor(Math.random() * workingDays.length)]; } while (usedDays.includes(day));
      usedDays.push(day);
      applications.push({
        type: 'business-trip',
        status: 1,
        data: JSON.stringify({ reason: 'Công tác', location: 'Hà Nội', startDate: `2025-10-${String(day).padStart(2,'0')}`, endDate: `2025-10-${String(day).padStart(2,'0')}`, totalDays: 1 }),
        userId, approvedBy: 2, approvedDate: new Date(2025, 9, day - 1),
        created_at: new Date(2025, 9, day - 3), updated_at: new Date(2025, 9, day - 1)
      });
    }

    for (let i = 0; i < numOT; i++) {
      const day = workingDays[Math.floor(Math.random() * workingDays.length)];
      const hours = [1, 1.5, 2, 2.5, 3][Math.floor(Math.random() * 5)];
      applications.push({
        type: 'overtime',
        status: 1,
        data: JSON.stringify({ reason: 'Hoàn thành dự án', date: `2025-10-${String(day).padStart(2,'0')}`, totalHours: hours }),
        userId, approvedBy: 2, approvedDate: new Date(2025, 9, day, 18, 30),
        created_at: new Date(2025, 9, day, 18, 0), updated_at: new Date(2025, 9, day, 18, 30)
      });
    }
  }

  for (let i = 0; i < applications.length; i += 100) {
    await knex('applications').insert(applications.slice(i, i + 100));
  }

  console.log(`✅ Tạo ${applications.length} đơn từ tháng 10/2025`);
};
