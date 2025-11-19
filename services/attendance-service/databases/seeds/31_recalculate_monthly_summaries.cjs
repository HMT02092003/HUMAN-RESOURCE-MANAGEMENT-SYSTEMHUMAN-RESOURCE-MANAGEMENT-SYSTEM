/**
 * Seed: Recalculate monthly summaries with working units
 * Tính lại tổng công tháng cho tất cả users
 */

exports.seed = async function(knex) {
  console.log('🔄 Recalculating monthly summaries with working units...\n');
  
  try {
    // 1. Get list of months that have attendance data
    const monthsData = await knex('time_attendances')
      .select(knex.raw("TO_CHAR(date, 'YYYY-MM') as month"))
      .groupBy('month')
      .orderBy('month', 'desc');
    
    console.log(`📅 Found ${monthsData.length} months with attendance data\n`);
    
    for (const { month } of monthsData) {
      console.log(`\n📊 Processing month: ${month}`);
      console.log('─'.repeat(60));
      
      // Get all users with attendance in this month
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const endDate = new Date(year, monthNum, 1).toISOString().split('T')[0]; // First day of next month
      
      const usersInMonth = await knex('time_attendances')
        .distinct('userId')
        .where('date', '>=', startDate)
        .where('date', '<', endDate)
        .pluck('userId');
      
      console.log(`   👥 ${usersInMonth.length} users found`);
      
      let processed = 0;
      
      for (const userId of usersInMonth) {
        try {
          // Get all attendance records for this user in this month
          const attendances = await knex('time_attendances')
            .where('userId', userId)
            .where('date', '>=', startDate)
            .where('date', '<', endDate)
            .select('*');
          
          if (attendances.length === 0) continue;
          
          // Calculate aggregates
          let totalWorkingUnits = 0;
          let totalOtWorkingUnits = 0;
          let presentDays = 0;
          let totalLateMinutes = 0;
          let totalEarlyLeaveMinutes = 0;
          let totalWorkHours = 0;
          let totalOvertimeHours = 0;
          let totalLatePenalty = 0; // ⭐ ADDED
          let totalEarlyLeavePenalty = 0; // ⭐ ADDED
          
          for (const att of attendances) {
            if (att.checkInTime && att.checkOutTime) {
              presentDays++;
            }
            
            // IMPORTANT: Must throw error if fields are missing
            if (att.totalWorkingUnit == null) {
              throw new Error(`Missing totalWorkingUnit for user ${userId} on ${att.date}`);
            }
            if (att.otWorkingUnit == null) {
              throw new Error(`Missing otWorkingUnit for user ${userId} on ${att.date}`);
            }
            
            totalWorkingUnits += parseFloat(att.totalWorkingUnit);
            totalOtWorkingUnits += parseFloat(att.otWorkingUnit);
            totalLateMinutes += parseFloat(att.lateMinutes || 0);
            totalEarlyLeaveMinutes += parseFloat(att.earlyDepartureMinutes || 0);
            totalWorkHours += parseFloat(att.dailyTotalWorkHours || 0);
            // FIXED: otMinutes removed from DB, calculate from otWorkingUnit
            totalOvertimeHours += parseFloat(att.otWorkingUnit || 0) * 8; // Assuming 8h per unit
            // ⭐ ADDED: Sum penalties
            totalLatePenalty += parseFloat(att.lateArrivalPenalty || 0);
            totalEarlyLeavePenalty += parseFloat(att.earlyLeavePenalty || 0);
          }
          
          const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty; // ⭐ ADDED
          
          // Insert or update monthly summary
          await knex('monthly_attendances')
            .insert({
              userId: userId,
              month: month,
              totalScheduledDays: presentDays,
              presentDays: presentDays,
              totalWorkingUnits: totalWorkingUnits.toFixed(4),
              totalOtWorkingUnits: totalOtWorkingUnits.toFixed(4),
              totalLateMinutes: Math.round(totalLateMinutes),
              totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
              totalWorkHours: totalWorkHours.toFixed(2),
              totalOvertimeHours: totalOvertimeHours.toFixed(2),
              totalLatePenalty: Math.round(totalLatePenalty), // ⭐ ADDED
              totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty), // ⭐ ADDED
              totalPenalty: Math.round(totalPenalty), // ⭐ ADDED
              isApproved: false,
              created_at: knex.fn.now(),
              updated_at: knex.fn.now()
            })
            .onConflict(['userId', 'month'])
            .merge({
              totalScheduledDays: presentDays,
              presentDays: presentDays,
              totalWorkingUnits: totalWorkingUnits.toFixed(4),
              totalOtWorkingUnits: totalOtWorkingUnits.toFixed(4),
              totalLateMinutes: Math.round(totalLateMinutes),
              totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
              totalWorkHours: totalWorkHours.toFixed(2),
              totalOvertimeHours: totalOvertimeHours.toFixed(2),
              totalLatePenalty: Math.round(totalLatePenalty), // ⭐ ADDED
              totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty), // ⭐ ADDED
              totalPenalty: Math.round(totalPenalty), // ⭐ ADDED
              updated_at: knex.fn.now()
            });
          
          processed++;
        } catch (err) {
          console.error(`   ❌ Error processing user ${userId} for month ${month}:`, err.message);
          throw err; // Re-throw to stop execution and force fix
        }
      }
      
      console.log(`   ✅ Processed ${processed} users for ${month}`);
    }
    
    // Show summary statistics
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY STATISTICS');
    console.log('═'.repeat(60));
    
    const summary = await knex('monthly_attendances')
      .select(
        knex.raw('COUNT(*) as total_records'),
        knex.raw('COUNT(DISTINCT "userId") as total_users'),
        knex.raw('COUNT(DISTINCT month) as total_months'),
        knex.raw('SUM("totalWorkingUnits") as total_units'),
        knex.raw('SUM("totalOtWorkingUnits") as total_ot_units'),
        knex.raw('AVG("totalWorkingUnits") as avg_units_per_user_month')
      )
      .first();
    
    console.log(`\n   Total monthly records: ${summary.total_records}`);
    console.log(`   Total users: ${summary.total_users}`);
    console.log(`   Total months: ${summary.total_months}`);
    console.log(`   Total working units: ${parseFloat(summary.total_units || 0).toFixed(2)}`);
    console.log(`   Total OT units: ${parseFloat(summary.total_ot_units || 0).toFixed(2)}`);
    console.log(`   Avg units per user/month: ${parseFloat(summary.avg_units_per_user_month || 0).toFixed(2)}`);
    
    // Sample data for recent month
    const recentMonth = await knex('monthly_attendances')
      .orderBy('month', 'desc')
      .limit(1)
      .first();
    
    if (recentMonth) {
      console.log(`\n   📋 Sample (Latest month - User ${recentMonth.userId}):`);
      console.log(`      Month: ${recentMonth.month}`);
      console.log(`      Present days: ${recentMonth.presentDays}`);
      console.log(`      Total units: ${parseFloat(recentMonth.totalWorkingUnits).toFixed(4)}`);
      console.log(`      OT units: ${parseFloat(recentMonth.totalOtWorkingUnits).toFixed(4)}`);
    }
    
    console.log('\n✅ Monthly summaries recalculated successfully!\n');
    
  } catch (error) {
    console.error('❌ Error recalculating monthly summaries:', error);
    throw error;
  }
};
