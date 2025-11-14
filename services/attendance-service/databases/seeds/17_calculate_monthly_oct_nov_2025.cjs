/**
 * Seed: Calculate Monthly Attendance Summary for Oct & Nov 2025
 * Tính toán tổng hợp chấm công tháng bao gồm penalties và overtime
 */

const knex = require('knex');

// Connect to other services to fetch salary and application data
const appDb = knex({ 
  client: 'pg', 
  connection: { 
    host: 'localhost', 
    port: 5432, 
    user: 'postgres', 
    password: '123456', 
    database: 'application_service' 
  } 
});

const salaryDb = knex({ 
  client: 'pg', 
  connection: { 
    host: 'localhost', 
    port: 5432, 
    user: 'postgres', 
    password: '123456', 
    database: 'salary_service' 
  } 
});

exports.seed = async function(mainKnex) {
  console.log('\n📊 Calculating Monthly Attendance Summary for Oct & Nov 2025...\n');
  
  try {
    // Delete existing monthly summaries for Oct & Nov 2025
    await mainKnex('monthly_attendances')
      .whereIn('month', ['2025-10', '2025-11'])
      .del();

    const months = [
      { 
        monthStr: '2025-10', 
        start: '2025-10-01', 
        end: '2025-10-31', 
        year: 2025, 
        monthIndex: 9, 
        totalDays: 31 
      },
      { 
        monthStr: '2025-11', 
        start: '2025-11-01', 
        end: '2025-11-14', // Chỉ tính đến hôm nay
        year: 2025, 
        monthIndex: 10, 
        totalDays: 14 // Chỉ 14 ngày
      }
    ];

    let totalRecords = 0;
    let totalPenaltyAmount = 0;
    
    for (const period of months) {
      console.log(`\n   Processing ${period.monthStr}...`);
      const records = [];
      
      // Calculate working days (weekdays only)
      let scheduledWorkingDays = 0;
      for (let day = 1; day <= period.totalDays; day++) {
        const d = new Date(period.year, period.monthIndex, day);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          scheduledWorkingDays++;
        }
      }
      
      for (let userId = 2; userId <= 101; userId++) {
        // Fetch attendance records
        const attendances = await mainKnex('time_attendances')
          .where('userId', userId)
          .whereBetween('date', [period.start, period.end]);

        // Fetch approved applications (leave, business trip, overtime)
        const apps = await appDb('applications')
          .where('userId', userId)
          .where('status', 1) // Approved
          .whereBetween('created_at', [period.start, period.end]);

        let approvedLeaveDays = 0;
        let businessTripDays = 0;
        let overtimeHours = 0;

        for (const app of apps) {
          let data = {};
          try { 
            data = typeof app.data === 'string' ? JSON.parse(app.data) : app.data || {};
          } catch (e) { 
            data = {};
          }
          
          const appType = String(app.type || '').toLowerCase();
          
          if (appType.includes('leave') || appType === 'nghi_phep') {
            approvedLeaveDays += Number(data.totalDays || data.days || 1);
          } else if (appType.includes('business') || appType.includes('trip') || appType === 'cong_tac') {
            businessTripDays += Number(data.totalDays || data.days || 1);
          } else if (appType.includes('overtime') || appType === 'lam_them') {
            overtimeHours += Number(data.totalHours || data.hours || 0);
          }
        }

        // Calculate attendance statistics
        const uniqueDates = new Set(attendances.map(a => {
          const dateStr = a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10);
          return dateStr;
        }));
        const presentDays = uniqueDates.size;

        const totalWorkHours = attendances.reduce((sum, a) => 
          sum + (Number(a.dailyTotalWorkHours) || 0), 0
        );
        
        const totalLateMinutes = attendances.reduce((sum, a) => 
          sum + (Number(a.lateMinutes) || 0), 0
        );
        
        const totalEarlyMinutes = attendances.reduce((sum, a) => 
          sum + (Number(a.earlyDepartureMinutes) || 0), 0
        );

        // Count violation days
        const lateDays = attendances.filter(a => (Number(a.lateMinutes) || 0) > 0).length;
        const earlyLeaveDays = attendances.filter(a => (Number(a.earlyDepartureMinutes) || 0) > 0).length;

        // Calculate absent days
        const absentDays = Math.max(0, scheduledWorkingDays - presentDays - approvedLeaveDays - businessTripDays);
        const unauthorizedAbsenceDays = absentDays; // All absences without approved leave

        // Fetch salary information
        let baseSalary = 0;
        try {
          const salaryProfile = await salaryDb('employee_salary_profiles')
            .where('user_id', userId)
            .first();
          baseSalary = Number(salaryProfile?.base_salary || 0);
        } catch (e) {
          baseSalary = 0;
        }

        // Fetch penalty settings
        let penaltyRatePerMinute = 0;
        try {
          const penaltySettings = await salaryDb('settings')
            .where('key', 'PenaltyRate')
            .first();
          if (penaltySettings?.value) {
            const parsed = typeof penaltySettings.value === 'string' 
              ? JSON.parse(penaltySettings.value) 
              : penaltySettings.value;
            penaltyRatePerMinute = Number(parsed?.rate || 0);
          }
        } catch (e) {
          penaltyRatePerMinute = 0;
        }

        // If no penalty rate found, use default: 0.01% of base salary per minute
        if (penaltyRatePerMinute === 0 && baseSalary > 0) {
          penaltyRatePerMinute = 0.0001; // 0.01% per minute
        }

        // Calculate penalties
        const totalLatePenalty = Math.round(baseSalary * penaltyRatePerMinute * totalLateMinutes * 100) / 100;
        const totalEarlyLeavePenalty = Math.round(baseSalary * penaltyRatePerMinute * totalEarlyMinutes * 100) / 100;
        
        // Unauthorized absence penalty: full day salary / scheduled days
        const dailySalary = scheduledWorkingDays > 0 ? baseSalary / scheduledWorkingDays : 0;
        const totalUnauthorizedAbsencePenalty = Math.round(unauthorizedAbsenceDays * dailySalary * 100) / 100;
        
        const totalPenalty = Math.round((totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty) * 100) / 100;

        // Calculate working units (công)
        const standardHoursPerDay = 8;
        const totalWorkingUnits = presentDays > 0 ? Math.round((totalWorkHours / standardHoursPerDay) * 100) / 100 : 0;
        const totalOtWorkingUnits = overtimeHours > 0 ? Math.round((overtimeHours / standardHoursPerDay) * 100) / 100 : 0;

        // Average work hours per present day
        const averageWorkHours = presentDays > 0 ? Math.round((totalWorkHours / presentDays) * 100) / 100 : 0;

        totalPenaltyAmount += totalPenalty;

        records.push({
          userId,
          month: period.monthStr,
          totalScheduledDays: scheduledWorkingDays,
          presentDays,
          absentDays,
          approvedLeaveDays,
          unauthorizedAbsenceDays,
          businessTripDays,
          lateDays,
          earlyLeaveDays,
          totalLateMinutes,
          totalEarlyLeaveMinutes: totalEarlyMinutes,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          averageWorkHours,
          totalWorkingUnits,
          totalOvertimeHours: Math.round(overtimeHours * 100) / 100,
          totalOtWorkingUnits,
          totalLatePenalty,
          totalEarlyLeavePenalty,
          totalUnauthorizedAbsencePenalty,
          totalPenalty,
          totalOvertimeSalary: 0, // Will be calculated by salary service
          isApproved: false,
          approvedBy: null,
          approvedAt: null,
          notes: null,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        await mainKnex('monthly_attendances').insert(batch);
      }
      
      totalRecords += records.length;
      const monthPenalty = records.reduce((sum, r) => sum + r.totalPenalty, 0);
      console.log(`      ✅ Created ${records.length} records`);
      console.log(`      💰 Total penalties: ${Math.round(monthPenalty).toLocaleString()} VND`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Total records: ${totalRecords}`);
    console.log(`   💰 Total penalties (both months): ${Math.round(totalPenaltyAmount).toLocaleString()} VND`);
    console.log(`\n✅ Monthly attendance calculation completed!\n`);
    
  } catch (error) {
    console.error('\n❌ Error calculating monthly attendance:', error);
    throw error;
  } finally {
    // Close connections
    await appDb.destroy();
    await salaryDb.destroy();
  }
};
