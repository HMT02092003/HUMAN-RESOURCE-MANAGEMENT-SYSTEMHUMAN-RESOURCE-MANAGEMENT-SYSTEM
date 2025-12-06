/**
 * SCRIPT: Tính toán lại dữ liệu monthly_attendances
 * 
 * Script này thực hiện:
 * 1. Lấy tất cả dữ liệu time_attendances
 * 2. Tính toán các thống kê tháng (presentDays, lateDays, v.v.)
 * 3. Tính penalty dựa trên settings
 * 4. Tính OT salary dựa trên lương cơ bản
 * 5. Cập nhật monthly_attendances với dailyDetails snapshot
 * 
 * Cách chạy:
 *   cd services/attendance-service
 *   node scripts/recalculate_monthly.cjs [month]
 * 
 * Ví dụ:
 *   node scripts/recalculate_monthly.cjs 2025-10
 *   node scripts/recalculate_monthly.cjs          # Tính tất cả tháng 10, 11, 12/2025
 */

const knex = require('knex');
require('dotenv').config();

// Database config
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'attendance_service',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456'
  }
};

const salaryDbConfig = {
  ...dbConfig,
  connection: {
    ...dbConfig.connection,
    database: 'salary_service'
  }
};

const appDbConfig = {
  ...dbConfig,
  connection: {
    ...dbConfig.connection,
    database: 'application_service'
  }
};
async function recalculateMonthly(targetMonth = null) {
  const db = knex(dbConfig);
  const salaryDb = knex(salaryDbConfig);
  const appDb = knex(appDbConfig);
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 RECALCULATE MONTHLY ATTENDANCE');
    console.log('='.repeat(70));
    
    // Lấy settings - dùng cách mới lấy theo key
    let penaltyRateLate = 10000; // Default: 10,000 VND/phút
    let penaltyRateEarly = 10000;
    let otMultiplier = 1.5;
    
    try {
      // Lấy tỷ lệ OT từ settings
      const otSetting = await db('settings').where('key', 'OvertimeRateInUnits').first();
      if (otSetting && otSetting.value) {
        const val = typeof otSetting.value === 'string' ? JSON.parse(otSetting.value) : otSetting.value;
        otMultiplier = val.rate || 1.5;
      }
    } catch (e) {
      console.log('⚠️ Cannot read OT settings, using default 1.5x');
    }
    
    console.log(`\n⚙️ Settings:`);
    console.log(`   Late penalty: ${penaltyRateLate} VND/phút`);
    console.log(`   Early leave penalty: ${penaltyRateEarly} VND/phút`);
    console.log(`   OT multiplier: ${otMultiplier}x`);
    
    // Xác định các tháng cần tính
    const months = targetMonth 
      ? [targetMonth]
      : ['2025-10', '2025-11', '2025-12'];
    
    console.log(`\n📅 Tháng cần tính: ${months.join(', ')}`);
    
    // Lấy danh sách users có salary từ salary_service
    const usersWithSalary = await salaryDb('employee_salary_profiles')
      .select('user_id', 'base_salary');
    
    const salaryMap = new Map();
    for (const u of usersWithSalary) {
      const userId = parseInt(u.user_id);
      salaryMap.set(userId, parseFloat(u.base_salary) || 0);
    }
    console.log(`\n👥 Có ${usersWithSalary.length} users với salary info`);

    
    // Lấy applications đã duyệt - lấy tất cả (không filter theo created_at)
    const approvedApps = await appDb('applications')
      .where('status', 1)
      .select('*');
    
    console.log(`📋 Có ${approvedApps.length} applications đã duyệt`);
    
    // Build maps cho applications
    const leaveMap = new Map(); // userId-date -> leave info
    const businessTripMap = new Map();
    const overtimeMap = new Map();
    
    for (const app of approvedApps) {
      try {
        const data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
        const userId = app.userId;
        
        if (app.type === 'leave') {
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
        }
      } catch (e) {
        // Skip invalid
      }
    }
    
    // Lấy holidays
    const holidays = await db('holidays')
      .whereRaw("start_date <= '2025-12-31' AND end_date >= '2025-10-01'")
      .select('*');
    
    const holidaySet = new Set();
    for (const h of holidays) {
      let cur = new Date(h.start_date);
      const end = new Date(h.end_date);
      while (cur <= end) {
        holidaySet.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }
    console.log(`🎉 Có ${holidaySet.size} ngày lễ`);
    
    // Helper: kiểm tra ngày làm việc
    const isWorkday = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      if (day === 0 || day === 6) return false;
      if (holidaySet.has(date)) return false;
      return true;
    };
    
    // Helper: lấy ngày làm việc trong tháng
    const getWorkdaysInMonth = (month, maxDay = 31) => {
      const [year, monthNum] = month.split('-').map(Number);
      const days = [];
      const daysInMonth = Math.min(new Date(year, monthNum, 0).getDate(), maxDay);
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (isWorkday(dateStr)) {
          days.push(dateStr);
        }
      }
      return days;
    };
    
    let totalUpdated = 0;
    
    for (const month of months) {
      console.log(`\n📅 Processing ${month}...`);
      
      const maxDay = month === '2025-12' ? 5 : 31; // Tháng 12 chỉ đến ngày 5
      const workdays = getWorkdaysInMonth(month, maxDay);
      console.log(`   📆 ${workdays.length} ngày làm việc`);
      
      // Lấy tất cả time_attendances của tháng - tính endDate đúng
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = `${month}-01`;
      // Tính ngày cuối tháng đúng
      const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
      const endDay = month === '2025-12' ? 5 : lastDayOfMonth;
      const endDate = `${month}-${String(endDay).padStart(2, '0')}`;
      
      const attendanceRecords = await db('time_attendances')
        .whereBetween('date', [startDate, endDate])
        .select('*');
      
      console.log(`   📊 ${attendanceRecords.length} attendance records`);
      
      // Group by userId
      const userAttendance = new Map();
      for (const record of attendanceRecords) {
        const userId = record.userId;
        if (!userAttendance.has(userId)) {
          userAttendance.set(userId, []);
        }
        userAttendance.get(userId).push(record);
      }
      
      // Lấy tất cả unique userIds
      const allUserIds = new Set([...userAttendance.keys()]);
      
      // Thêm users có trong monthly_attendances hiện tại
      const existingMonthly = await db('monthly_attendances')
        .where('month', month)
        .select('userId');
      for (const m of existingMonthly) {
        allUserIds.add(m.userId);
      }
      
      console.log(`   👥 ${allUserIds.size} users to process`);
      
      let monthUpdated = 0;
      
      for (const userId of allUserIds) {
        const records = userAttendance.get(userId) || [];
        const baseSalary = salaryMap.get(userId) || 0;
        const dailySalary = baseSalary / workdays.length;
        const hourlyRate = dailySalary / 8;
        
        // Build attendance map
        // QUAN TRỌNG: Cần convert date sang local timezone (VN = UTC+7) trước khi lấy YYYY-MM-DD
        const attendanceMap = new Map();
        for (const r of records) {
          // Thêm 7 giờ để chuyển từ UTC sang Vietnam timezone trước khi lấy date
          const d = new Date(r.date);
          d.setHours(d.getHours() + 7);
          const dateStr = d.toISOString().split('T')[0];
          attendanceMap.set(dateStr, r);
        }
        
        // Calculate monthly stats
        let presentDays = 0;
        let approvedLeaveDays = 0;
        let businessTripDays = 0;
        let unauthorizedAbsenceDays = 0;
        let lateDays = 0;
        let earlyLeaveDays = 0;
        let totalLateMinutes = 0;
        let totalEarlyLeaveMinutes = 0;
        let totalWorkHours = 0;
        let totalWorkingUnits = 0;
        let totalOvertimeHours = 0;
        let totalOtWorkingUnits = 0;
        
        const dailyDetails = [];
        
        for (const date of workdays) {
          const appKey = `${userId}-${date}`;
          const attendance = attendanceMap.get(date);
          const hasLeave = leaveMap.has(appKey);
          const hasBusinessTrip = businessTripMap.has(appKey);
          const hasOT = overtimeMap.has(appKey);
          
          const dayDetail = {
            date,
            isWorkingDay: true,
            isHoliday: false,
            status: 'unknown',
            checkInTime: null,
            checkOutTime: null,
            workHours: 0,
            lateMinutes: 0,
            earlyMinutes: 0,
            workingUnit: 0,
            otHours: 0,
            otWorkingUnit: 0
          };
          
          if (hasLeave) {
            dayDetail.status = 'approved_leave';
            dayDetail.leaveInfo = leaveMap.get(appKey);
            dayDetail.workingUnit = 1;
            approvedLeaveDays++;
            totalWorkingUnits += 1;
          } else if (hasBusinessTrip) {
            dayDetail.status = 'business_trip';
            dayDetail.businessTripInfo = businessTripMap.get(appKey);
            dayDetail.workingUnit = 1;
            dayDetail.workHours = 8;
            businessTripDays++;
            totalWorkingUnits += 1;
            totalWorkHours += 8;
            presentDays++;
          } else if (attendance) {
            dayDetail.status = 'present';
            dayDetail.checkInTime = attendance.checkInTime;
            dayDetail.checkOutTime = attendance.checkOutTime;
            dayDetail.workHours = parseFloat(attendance.dailyTotalWorkHours) || 0;
            dayDetail.lateMinutes = parseFloat(attendance.lateMinutes) || 0;
            dayDetail.earlyMinutes = parseFloat(attendance.earlyDepartureMinutes) || 0;
            dayDetail.workingUnit = parseFloat(attendance.dailyWorkingUnit) || 0;
            
            presentDays++;
            totalWorkHours += dayDetail.workHours;
            totalWorkingUnits += dayDetail.workingUnit;
            
            if (dayDetail.lateMinutes > 0) {
              lateDays++;
              totalLateMinutes += dayDetail.lateMinutes;
            }
            if (dayDetail.earlyMinutes > 0) {
              earlyLeaveDays++;
              totalEarlyLeaveMinutes += dayDetail.earlyMinutes;
            }
            
            // OT
            if (hasOT) {
              const otInfo = overtimeMap.get(appKey);
              dayDetail.otHours = otInfo.totalHours || 0;
              dayDetail.otWorkingUnit = dayDetail.otHours / 8;
              totalOvertimeHours += dayDetail.otHours;
              totalOtWorkingUnits += dayDetail.otWorkingUnit;
            }
          } else {
            // Không có attendance và không có leave/business trip -> nghỉ không phép
            dayDetail.status = 'unauthorized_absence';
            unauthorizedAbsenceDays++;
          }
          
          dailyDetails.push(dayDetail);
        }
        
        // Calculate penalties
        const totalLatePenalty = Math.round(totalLateMinutes * penaltyRateLate);
        const totalEarlyLeavePenalty = Math.round(totalEarlyLeaveMinutes * penaltyRateEarly);
        const totalUnauthorizedAbsencePenalty = Math.round(unauthorizedAbsenceDays * dailySalary);
        const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;
        
        // Tính OT salary - chỉ log, không lưu vào DB (column không tồn tại)
        const totalOvertimeSalary = Math.round(totalOvertimeHours * hourlyRate * otMultiplier);
        
        const averageWorkHours = presentDays > 0 ? totalWorkHours / presentDays : 0;
        const absentDays = unauthorizedAbsenceDays;
        
        // Upsert monthly_attendances - chỉ lưu các column tồn tại
        const monthlyRecord = {
          userId,
          month,
          totalScheduledDays: workdays.length,
          presentDays,
          absentDays,
          approvedLeaveDays,
          unauthorizedAbsenceDays,
          businessTripDays,
          lateDays,
          earlyLeaveDays,
          totalLateMinutes,
          totalEarlyLeaveMinutes,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          averageWorkHours: Math.round(averageWorkHours * 100) / 100,
          totalWorkingUnits: Math.round(totalWorkingUnits * 100) / 100,
          totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
          totalOtWorkingUnits: Math.round(totalOtWorkingUnits * 100) / 100,
          totalLatePenalty,
          totalEarlyLeavePenalty,
          totalUnauthorizedAbsencePenalty,
          totalPenalty,
          // Không lưu totalOvertimeSalary và dailyDetails vì không có column trong DB
          updated_at: new Date()
        };
        
        // Log để kiểm tra
        if (monthUpdated < 3) {
          console.log(`   📋 User ${userId}: present=${presentDays}, leave=${approvedLeaveDays}, trip=${businessTripDays}, absent=${unauthorizedAbsenceDays}`);
          console.log(`      Penalty: late=${totalLatePenalty}, early=${totalEarlyLeavePenalty}, absence=${totalUnauthorizedAbsencePenalty}`);
          console.log(`      OT: hours=${totalOvertimeHours}, salary=${totalOvertimeSalary} (not saved to DB)`);
        }
        
        // Check if exists
        const existing = await db('monthly_attendances')
          .where({ userId, month })
          .first();
        
        if (existing) {
          await db('monthly_attendances')
            .where({ userId, month })
            .update(monthlyRecord);
        } else {
          monthlyRecord.created_at = new Date();
          await db('monthly_attendances').insert(monthlyRecord);
        }
        
        monthUpdated++;
      }
      
      console.log(`   ✅ Updated ${monthUpdated} monthly records`);
      totalUpdated += monthUpdated;
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`✅ HOÀN THÀNH! Đã cập nhật ${totalUpdated} records`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.destroy();
    await salaryDb.destroy();
    await appDb.destroy();
  }
}

// Run script
const targetMonth = process.argv[2];
recalculateMonthly(targetMonth)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
