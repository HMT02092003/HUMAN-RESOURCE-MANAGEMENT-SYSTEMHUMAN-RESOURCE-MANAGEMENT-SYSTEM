// SEED: Don tu Oct/Nov/Dec 2025 (100 Employees)
// Chi tao 2 loai don: Leave va Business Trip

exports.seed = async function(knex) {
  console.log('\n' + '='.repeat(70));
  console.log('SEED: Don tu Oct/Nov/Dec 2025 (Leave + Business Trip)');
  console.log('='.repeat(70));
  
  // Xoa du lieu cu
  await knex('applications')
    .whereRaw("created_at >= '2025-10-01' AND created_at <= '2025-12-31'")
    .del();
  console.log('\nDa xoa du lieu cu');
  
  // Helper: Kiem tra ngay lam viec
  const isWorkingDay = (year, month, day) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  };
  
  // Helper: Lay ngay lam viec trong thang
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

  const applications = [];
  
  // Cac thang can seed
  const months = [
    { year: 2025, month: 9, name: 'October 2025', maxDay: null },
    { year: 2025, month: 10, name: 'November 2025', maxDay: null },
    { year: 2025, month: 11, name: 'December 2025', maxDay: 5 }
  ];

  let stats = { leave: 0, businessTrip: 0, totalLeaveDays: 0, totalTripDays: 0 };

  // Ly do nghi phep
  const leaveReasonsPaid = ['Nghi phep nam', 'Nghi cuoi', 'Nghi phep theo quy dinh'];
  const leaveReasonsRegular = ['Nghi viec rieng', 'Nghi khong luong'];
  const leaveReasonsSick = ['Nghi om', 'Kham benh', 'Cham soc nguoi than om'];
  
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

      // DON NGHI PHEP
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
          
          const startDateStr = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(startDay).padStart(2,'0');
          const endDateStr = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(endDay).padStart(2,'0');
          
          // Random loai nghi: paid (60%), regular (30%), sick (10%)
          const rand = Math.random();
          let leaveType, applicationCategory, reasons;
          if (rand < 0.6) {
            leaveType = 'paid';
            applicationCategory = 'paid';
            reasons = leaveReasonsPaid;
          } else if (rand < 0.9) {
            leaveType = 'regular';
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
            status: 1,
            data: JSON.stringify({ 
              reason: reason,
              leaveType: leaveType,
              applicationCategory: applicationCategory,
              startDate: startDateStr, 
              endDate: endDateStr, 
              totalDays: actualDays 
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

      // DON CONG TAC
      for (let i = 0; i < numTrip; i++) {
        let startDay;
        let attempts = 0;
        do { 
          startDay = workingDays[Math.floor(Math.random() * workingDays.length)]; 
          attempts++;
        } while (usedDays.has(startDay) && attempts < 30);
        
        if (!usedDays.has(startDay)) {
          // Random so ngay cong tac (1-5 ngay, co the qua cuoi tuan)
          const duration = Math.random() > 0.6 
            ? (Math.random() > 0.5 ? (Math.floor(Math.random() * 3) + 3) : 2)
            : 1;
          
          const endDay = Math.min(startDay + duration - 1, daysInMonth);
          const actualDays = endDay - startDay + 1;
          
          for (let d = startDay; d <= endDay; d++) {
            usedDays.add(d);
          }
          
          const startDateStr = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(startDay).padStart(2,'0');
          const endDateStr = year + '-' + String(month + 1).padStart(2,'0') + '-' + String(endDay).padStart(2,'0');
          
          const destination = tripDestinations[Math.floor(Math.random() * tripDestinations.length)];
          const purpose = tripPurposes[Math.floor(Math.random() * tripPurposes.length)];
          const estimatedCost = Math.floor(Math.random() * 10 + 1) * 1000000;
          
          applications.push({
            type: 'business-trip',
            status: 1,
            data: JSON.stringify({ 
              reason: purpose,
              purpose: purpose,
              location: 'TP.HCM',
              destination: destination,
              startDate: startDateStr, 
              endDate: endDateStr, 
              totalDays: actualDays,
              estimatedCost: estimatedCost
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
    }
  }

  // Insert theo batch
  console.log('\nDang insert du lieu...');
  for (let i = 0; i < applications.length; i += 100) {
    await knex('applications').insert(applications.slice(i, i + 100));
  }

  console.log('\n' + '='.repeat(70));
  console.log('HOAN THANH SEED DON TU!');
  console.log('  Tong: ' + applications.length + ' don tu');
  console.log('  Nghi phep: ' + stats.leave + ' don (' + stats.totalLeaveDays + ' ngay)');
  console.log('  Cong tac: ' + stats.businessTrip + ' don (' + stats.totalTripDays + ' ngay)');
  console.log('='.repeat(70));
};
