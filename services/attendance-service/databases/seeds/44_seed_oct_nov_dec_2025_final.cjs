/**
 * SEED CHÍNH: Tạo dữ liệu chấm công Oct/Nov/Dec 2025
 * 
 * Bao gồm đầy đủ các case:
 * - Đi làm bình thường (có check-in/check-out)
 * - Đi muộn / Về sớm  
 * - Nghỉ phép (approved leave) - sync với application-service
 * - Nghỉ không phép (unauthorized absence)
 * - Công tác (business trip) - sync với application-service
 * - Làm thêm giờ (OT) - sync với application-service
 * 
 * Tháng 12 tính đến ngày 5/12/2025 (ngày hiện tại)
 */

exports.seed = async function(knex) {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 SEED CHÍNH: Chấm công Oct/Nov/Dec 2025');
  console.log('   Đầy đủ các case: đi làm, nghỉ phép, nghỉ không phép, công tác, OT');
  console.log('='.repeat(70));
  
  // =============================================
  // STEP 1: Xóa dữ liệu cũ
  // =============================================
  console.log('\n🗑️  Xóa dữ liệu cũ...');
  await knex('time_attendances')
    .whereRaw("date >= '2025-10-01' AND date <= '2025-12-31'")
    .del();
  await knex('monthly_attendances')
    .whereIn('month', ['2025-10', '2025-11', '2025-12'])
    .del();
  console.log('   ✅ Đã xóa dữ liệu cũ');

  // =============================================
  // STEP 2: Lấy dữ liệu applications đã duyệt từ application-service DB
  // =============================================
  console.log('\n📋 Đang lấy dữ liệu applications đã duyệt...');
  
  // Tạo kết nối tới application-service DB
  const appDbConfig = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: 'application_service',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456'
    }
  };
  
  let approvedApplications = [];
  try {
    const appKnex = require('knex')(appDbConfig);
    // Lấy TẤT CẢ applications đã duyệt (không filter theo created_at)
    // Vì đơn có thể được tạo trước ngày nghỉ (VD: tạo 30/9 cho ngày nghỉ 02/10)
    approvedApplications = await appKnex('applications')
      .where('status', 1) // status = 1 là approved
      .select('*');
    await appKnex.destroy();
    console.log(`   ✅ Lấy được ${approvedApplications.length} đơn từ đã duyệt`);
  } catch (err) {
    console.log(`   ⚠️ Không thể lấy dữ liệu applications: ${err.message}`);
    console.log('   ➡️ Tiếp tục với dữ liệu mặc định...');
  }
  
  // Build maps cho từng loại application theo userId và date
  const leaveMap = new Map(); // userId-date -> leave info
  const businessTripMap = new Map(); // userId-date -> business trip info
  const overtimeMap = new Map(); // userId-date -> OT info
  const forgotCheckMap = new Map(); // userId-date -> forgot check info
  
  for (const app of approvedApplications) {
    try {
      const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
      const userId = app.userId;
      
      if (app.type === 'leave') {
        // Leave có startDate và endDate
        const startDate = data.startDate;
        const endDate = data.endDate || data.startDate;
        let cur = new Date(startDate);
        const end = new Date(endDate);
        while (cur <= end) {
          const dateKey = cur.toISOString().split('T')[0];
          leaveMap.set(`${userId}-${dateKey}`, { ...data, appId: app.id });
          cur.setDate(cur.getDate() + 1);
        }
      } else if (app.type === 'business-trip') {
        const startDate = data.startDate;
        const endDate = data.endDate || data.startDate;
        let cur = new Date(startDate);
        const end = new Date(endDate);
        while (cur <= end) {
          const dateKey = cur.toISOString().split('T')[0];
          businessTripMap.set(`${userId}-${dateKey}`, { ...data, appId: app.id });
          cur.setDate(cur.getDate() + 1);
        }
      } else if (app.type === 'overtime') {
        const date = data.date;
        if (date) {
          overtimeMap.set(`${userId}-${date}`, { ...data, appId: app.id });
        }
      } else if (app.type === 'forgot-check') {
        const date = data.forgotDate;
        if (date) {
          forgotCheckMap.set(`${userId}-${date}`, { ...data, appId: app.id });
        }
      }
    } catch (e) {
      // Skip invalid application data
    }
  }
  
  console.log(`   📊 Leave days: ${leaveMap.size}, Business trips: ${businessTripMap.size}, OT: ${overtimeMap.size}, Forgot check: ${forgotCheckMap.size}`);

  // =============================================
  // STEP 3: User IDs (1-100)
  // =============================================
  const userIds = Array.from({ length: 100 }, (_, i) => i + 1);
  console.log(`\n👥 Sử dụng ${userIds.length} user IDs (1-100)`);

  // =============================================
  // HELPER FUNCTIONS
  // =============================================
  
  const isWorkday = (date) => {
    const day = new Date(date).getDay();
    return day >= 1 && day <= 5;
  };
  
  const getWorkdaysInMonth = (year, month, maxDay = 31) => {
    const days = [];
    const daysInMonth = Math.min(new Date(year, month, 0).getDate(), maxDay);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (isWorkday(dateStr)) {
        days.push(dateStr);
      }
    }
    return days;
  };
  
  // Tạo thời gian check-in/check-out - ca 8h-17h
  const generateDayTimes = (isLateForced = false, isEarlyLeaveForced = false) => {
    let checkInHour, checkInMinute, checkOutHour, checkOutMinute;
    
    if (isLateForced) {
      // Đi muộn: 8:05-8:45
      checkInHour = 8;
      checkInMinute = 5 + Math.floor(Math.random() * 40);
    } else if (Math.random() < 0.7) {
      // 70% đúng giờ: đến 7:50-8:00
      checkInHour = 7;
      checkInMinute = 50 + Math.floor(Math.random() * 10);
      if (checkInMinute >= 60) { checkInHour = 8; checkInMinute = 0; }
    } else {
      // 30% đi muộn nhẹ: 8:01-8:15
      checkInHour = 8;
      checkInMinute = 1 + Math.floor(Math.random() * 14);
    }
    
    if (isEarlyLeaveForced) {
      // Về sớm: 16:00-16:45
      checkOutHour = 16;
      checkOutMinute = Math.floor(Math.random() * 45);
    } else if (Math.random() < 0.75) {
      // 75% về đúng giờ: 17:00-17:20
      checkOutHour = 17;
      checkOutMinute = Math.floor(Math.random() * 20);
    } else {
      // 25% về sớm nhẹ: 16:45-16:59
      checkOutHour = 16;
      checkOutMinute = 45 + Math.floor(Math.random() * 14);
    }
    
    const formatTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    
    return {
      checkInTime: formatTime(checkInHour, checkInMinute),
      checkOutTime: formatTime(checkOutHour, checkOutMinute),
      checkInHour, checkInMinute, checkOutHour, checkOutMinute
    };
  };
  
  // Tính số giờ làm việc (trừ 1h nghỉ trưa)
  const calculateWorkHours = (inH, inM, outH, outM) => {
    const inMinutes = inH * 60 + inM;
    const outMinutes = outH * 60 + outM;
    return Math.max(0, (outMinutes - inMinutes - 60) / 60);
  };
  
  // Tính muộn/sớm (ca 8h-17h)
  const calculateLateness = (inH, inM, outH, outM) => {
    const lateMinutes = Math.max(0, (inH * 60 + inM) - (8 * 60));
    const earlyMinutes = Math.max(0, (17 * 60) - (outH * 60 + outM));
    return { lateMinutes, earlyMinutes };
  };

  // =============================================
  // STEP 4: Tạo time_attendances
  // =============================================
  const months = [
    { year: 2025, month: 10, name: 'Tháng 10/2025' },
    { year: 2025, month: 11, name: 'Tháng 11/2025' },
    { year: 2025, month: 12, name: 'Tháng 12/2025', maxDay: 5 } // Đến ngày 5/12/2025
  ];
  
  let totalRecords = 0;
  const batchSize = 500;
  let batch = [];
  
  // Lưu thông tin cho monthly calculation
  const monthlyData = {}; // { 'userId-month': { ... } }
  
  for (const monthInfo of months) {
    console.log(`\n📅 ${monthInfo.name}`);
    
    const workdays = getWorkdaysInMonth(monthInfo.year, monthInfo.month, monthInfo.maxDay || 31);
    const monthStr = `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;
    console.log(`   📆 ${workdays.length} ngày làm việc`);
    
    let monthRecords = 0;
    let monthStats = { present: 0, leave: 0, businessTrip: 0, absent: 0, ot: 0 };
    
    for (const userId of userIds) {
      // Init monthly data
      const key = `${userId}-${monthStr}`;
      monthlyData[key] = {
        userId,
        month: monthStr,
        totalScheduledDays: workdays.length,
        presentDays: 0,
        absentDays: 0,
        approvedLeaveDays: 0,
        unauthorizedAbsenceDays: 0,
        businessTripDays: 0,
        lateDays: 0,
        earlyLeaveDays: 0,
        totalLateMinutes: 0,
        totalEarlyLeaveMinutes: 0,
        totalWorkHours: 0,
        totalWorkingUnits: 0,
        totalOvertimeHours: 0,
        totalOtWorkingUnits: 0
      };
      
      for (const date of workdays) {
        const appKey = `${userId}-${date}`;
        
        // Check các trường hợp đặc biệt từ applications
        const hasLeave = leaveMap.has(appKey);
        const hasBusinessTrip = businessTripMap.has(appKey);
        const hasOT = overtimeMap.has(appKey);
        const hasForgotCheck = forgotCheckMap.has(appKey);
        
        // CASE 1: Nghỉ phép - không có time_attendance record
        if (hasLeave) {
          monthlyData[key].approvedLeaveDays++;
          monthlyData[key].totalWorkingUnits += 1; // Nghỉ phép vẫn tính 1 công
          monthStats.leave++;
          continue;
        }
        
        // CASE 2: Công tác - tạo record với flag đặc biệt
        if (hasBusinessTrip) {
          monthlyData[key].businessTripDays++;
          monthlyData[key].totalWorkingUnits += 1; // Công tác tính 1 công
          monthlyData[key].presentDays++;
          monthStats.businessTrip++;
          
          // Tạo attendance record cho công tác (8h làm việc chuẩn)
          batch.push({
            userId,
            date,
            checkInTime: `${date}T08:00:00+07:00`,
            checkOutTime: `${date}T17:00:00+07:00`,
            dailyTotalWorkHours: 8,
            dailyWorkingUnit: 1,
            totalWorkingUnit: 1,
            otWorkingUnit: 0,
            lateMinutes: 0,
            earlyDepartureMinutes: 0,
            lateArrivalPenalty: 0,
            earlyLeavePenalty: 0,
            created_at: new Date(),
            updated_at: new Date()
          });
          monthRecords++;
          totalRecords++;
          continue;
        }
        
        // CASE 3: Random nghỉ không phép (3% mỗi ngày)
        if (Math.random() < 0.03) {
          monthlyData[key].unauthorizedAbsenceDays++;
          monthlyData[key].absentDays++;
          monthStats.absent++;
          continue;
        }
        
        // CASE 4: Đi làm bình thường
        // Kiểm tra forgot-check để điều chỉnh thời gian
        let times;
        if (hasForgotCheck) {
          const forgotData = forgotCheckMap.get(appKey);
          if (forgotData.forgotType === 'check-in') {
            // Quên check-in: dùng actualTime làm check-in
            const actualTime = forgotData.actualTime ? new Date(forgotData.actualTime) : null;
            times = generateDayTimes();
            if (actualTime) {
              times.checkInHour = actualTime.getHours();
              times.checkInMinute = actualTime.getMinutes();
              times.checkInTime = `${String(times.checkInHour).padStart(2,'0')}:${String(times.checkInMinute).padStart(2,'0')}:00`;
            }
          } else {
            // Quên check-out: dùng actualTime làm check-out
            const actualTime = forgotData.actualTime ? new Date(forgotData.actualTime) : null;
            times = generateDayTimes();
            if (actualTime) {
              times.checkOutHour = actualTime.getHours();
              times.checkOutMinute = actualTime.getMinutes();
              times.checkOutTime = `${String(times.checkOutHour).padStart(2,'0')}:${String(times.checkOutMinute).padStart(2,'0')}:00`;
            }
          }
        } else {
          times = generateDayTimes();
        }
        
        const workHours = calculateWorkHours(times.checkInHour, times.checkInMinute, times.checkOutHour, times.checkOutMinute);
        const { lateMinutes, earlyMinutes } = calculateLateness(times.checkInHour, times.checkInMinute, times.checkOutHour, times.checkOutMinute);
        
        // Tính công: 1 công nếu làm >= 4h
        let dailyWorkingUnit = workHours >= 4 ? 1 : 0.5;
        let otWorkingUnit = 0;
        
        // CASE 5: Có đơn OT được duyệt
        if (hasOT) {
          const otData = overtimeMap.get(appKey);
          const otHours = otData.totalHours || 0;
          otWorkingUnit = otHours / 8; // Mỗi 8h OT = 1 công OT
          monthlyData[key].totalOvertimeHours += otHours;
          monthlyData[key].totalOtWorkingUnits += otWorkingUnit;
          monthStats.ot++;
        }
        
        // Cập nhật monthly data
        monthlyData[key].presentDays++;
        monthlyData[key].totalWorkHours += workHours;
        monthlyData[key].totalWorkingUnits += dailyWorkingUnit;
        monthlyData[key].totalLateMinutes += lateMinutes;
        monthlyData[key].totalEarlyLeaveMinutes += earlyMinutes;
        if (lateMinutes > 0) monthlyData[key].lateDays++;
        if (earlyMinutes > 0) monthlyData[key].earlyLeaveDays++;
        monthStats.present++;
        
        batch.push({
          userId,
          date,
          checkInTime: `${date}T${times.checkInTime}+07:00`,
          checkOutTime: `${date}T${times.checkOutTime}+07:00`,
          dailyTotalWorkHours: Math.round(workHours * 100) / 100,
          dailyWorkingUnit,
          totalWorkingUnit: dailyWorkingUnit + otWorkingUnit,
          otWorkingUnit,
          lateMinutes,
          earlyDepartureMinutes: earlyMinutes,
          lateArrivalPenalty: 0,
          earlyLeavePenalty: 0,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        monthRecords++;
        totalRecords++;
        
        if (batch.length >= batchSize) {
          await knex('time_attendances').insert(batch);
          batch = [];
        }
      }
    }
    
    if (batch.length > 0) {
      await knex('time_attendances').insert(batch);
      batch = [];
    }
    
    console.log(`   ✅ ${monthRecords} time_attendances records`);
    console.log(`   📊 Thống kê: Present=${monthStats.present}, Leave=${monthStats.leave}, BusinessTrip=${monthStats.businessTrip}, Absent=${monthStats.absent}, OT=${monthStats.ot}`);
  }
  
  console.log(`\n📊 Tổng: ${totalRecords} time_attendances records`);

  // =============================================
  // STEP 5: Tạo monthly_attendances từ dữ liệu đã tính
  // =============================================
  console.log('\n🔄 Đang tạo monthly_attendances...');
  
  const monthlyRecords = Object.values(monthlyData).map((data) => {
    const d = data;
    const avgHours = d.presentDays > 0 ? d.totalWorkHours / d.presentDays : 0;
    
    return {
      userId: d.userId,
      month: d.month,
      totalScheduledDays: d.totalScheduledDays,
      presentDays: d.presentDays,
      absentDays: d.absentDays + d.unauthorizedAbsenceDays,
      approvedLeaveDays: d.approvedLeaveDays,
      unauthorizedAbsenceDays: d.unauthorizedAbsenceDays,
      businessTripDays: d.businessTripDays,
      lateDays: d.lateDays,
      earlyLeaveDays: d.earlyLeaveDays,
      totalLateMinutes: d.totalLateMinutes,
      totalEarlyLeaveMinutes: d.totalEarlyLeaveMinutes,
      totalWorkHours: Math.round(d.totalWorkHours * 100) / 100,
      averageWorkHours: Math.round(avgHours * 100) / 100,
      totalWorkingUnits: Math.round(d.totalWorkingUnits * 100) / 100,
      totalOvertimeHours: Math.round(d.totalOvertimeHours * 100) / 100,
      totalOtWorkingUnits: Math.round(d.totalOtWorkingUnits * 100) / 100,
      totalLatePenalty: 0, // Sẽ được tính trong script recalculate
      totalEarlyLeavePenalty: 0,
      totalUnauthorizedAbsencePenalty: 0,
      totalPenalty: 0,
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
      notes: null,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
  
  // Tất cả users đều có record monthly (kể cả nghỉ cả tháng)
  const validMonthlyRecords = monthlyRecords.filter(r => r.totalScheduledDays > 0);
  
  // Insert batch
  const monthlyBatchSize = 100;
  for (let i = 0; i < validMonthlyRecords.length; i += monthlyBatchSize) {
    const batchInsert = validMonthlyRecords.slice(i, i + monthlyBatchSize);
    await knex('monthly_attendances').insert(batchInsert);
  }
  
  console.log(`   ✅ ${validMonthlyRecords.length} monthly_attendances records`);

  // =============================================
  // VERIFY
  // =============================================
  console.log('\n' + '='.repeat(70));
  console.log('✅ HOÀN THÀNH SEED DỮ LIỆU CHẤM CÔNG!');
  
  const verifyTime = await knex('time_attendances')
    .whereRaw("date >= '2025-10-01' AND date <= '2025-12-31'")
    .count('* as count')
    .first();
  
  const verifyMonthly = await knex('monthly_attendances')
    .whereIn('month', ['2025-10', '2025-11', '2025-12'])
    .count('* as count')
    .first();
  
  console.log(`   📊 time_attendances: ${verifyTime.count} records`);
  console.log(`   📊 monthly_attendances: ${verifyMonthly.count} records`);
  
  // Sample data với đầy đủ thông tin
  const samples = await knex('monthly_attendances')
    .whereIn('month', ['2025-10', '2025-11', '2025-12'])
    .andWhere('presentDays', '>', 0)
    .limit(3);
  
  for (const sample of samples) {
    console.log(`\n📋 Sample (user ${sample.userId}, ${sample.month}):`);
    console.log(`   📅 Ngày làm việc: ${sample.totalScheduledDays}`);
    console.log(`   ✅ Có mặt: ${sample.presentDays} | 🏖️ Nghỉ phép: ${sample.approvedLeaveDays}`);
    console.log(`   🚗 Công tác: ${sample.businessTripDays} | ❌ Vắng không phép: ${sample.unauthorizedAbsenceDays}`);
    console.log(`   ⏰ Đi muộn: ${sample.lateDays} ngày (${sample.totalLateMinutes} phút)`);
    console.log(`   🏃 Về sớm: ${sample.earlyLeaveDays} ngày (${sample.totalEarlyLeaveMinutes} phút)`);
    console.log(`   💼 Tổng công: ${sample.totalWorkingUnits} | OT: ${sample.totalOtWorkingUnits} công`);
    console.log(`   🕐 Tổng giờ làm: ${sample.totalWorkHours}h | OT: ${sample.totalOvertimeHours}h`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📝 GHI CHÚ: Chạy script recalculate_monthly.cjs để tính penalty và OT salary');
  console.log('='.repeat(70));
};
