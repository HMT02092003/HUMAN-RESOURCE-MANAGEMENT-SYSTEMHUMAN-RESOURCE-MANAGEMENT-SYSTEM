/**
 * Seed 32: Update penalty calculations for ALL attendance records
 * Tính lại tiền phạt đi muộn/về sớm cho TẤT CẢ records
 * 
 * Formula from salary-service settings:
 * - Late penalty: lateMinutes * (baseSalary / standardWorkingDays / 480) * latePenaltyRate
 * - Early leave penalty: earlyMinutes * (baseSalary / standardWorkingDays / 480) * earlyLeavePenaltyRate
 * 
 * Where 480 = 8 hours * 60 minutes = standard work day in minutes
 */

exports.seed = async function(knex) {
  console.log('🔄 Recalculating penalties for all attendance records...\n');
  
  try {
    // 1. Get penalty rates from salary-service database
    console.log('📊 Step 1: Fetching penalty rates from salary-service...');
    
    // Note: We need to connect to salary_service database to get the rates
    // For now, use default rates if not found
    const defaultLatePenaltyRate = 1.0; // 100% per minute
    const defaultEarlyLeavePenaltyRate = 1.0; // 100% per minute
    const defaultBaseSalary = 20000000; // 20M VNĐ default
    const defaultStandardWorkingDays = 22;

    console.log(`   Using rates:`);
    console.log(`   - Late penalty rate: ${defaultLatePenaltyRate}`);
    console.log(`   - Early leave penalty rate: ${defaultEarlyLeavePenaltyRate}`);
    console.log(`   - Default base salary: ${defaultBaseSalary.toLocaleString()} VNĐ`);
    console.log(`   - Standard working days: ${defaultStandardWorkingDays}\n`);

    // 2. Get all attendance records with late/early minutes
    console.log('📊 Step 2: Fetching attendance records...');
    
    const records = await knex('time_attendances')
      .whereNotNull('checkInTime')
      .whereNotNull('checkOutTime')
      .select('id', 'userId', 'date', 'lateMinutes', 'earlyDepartureMinutes');
    
    console.log(`   Found ${records.length} records to process\n`);

    // 3. Get user salaries (simplified - use default if not found)
    // In real implementation, you'd query employee_service for actual salaries
    const userSalaries = {}; // userId -> baseSalary map
    // For now, all users have default salary

    // 4. Process records in batches
    console.log('📊 Step 3: Calculating penalties...');
    
    const batchSize = 100;
    let updated = 0;
    let totalLatePenalty = 0;
    let totalEarlyPenalty = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Get user's base salary (use default if not found)
          const baseSalary = userSalaries[record.userId] || defaultBaseSalary;
          
          // Calculate penalty per minute
          // Formula: (baseSalary / standardWorkingDays / 480 minutes)
          const penaltyPerMinute = baseSalary / defaultStandardWorkingDays / 480;
          
          // Calculate late arrival penalty
          const lateMinutes = parseFloat(record.lateMinutes || 0);
          const lateArrivalPenalty = lateMinutes > 0 
            ? Math.round(lateMinutes * penaltyPerMinute * defaultLatePenaltyRate)
            : 0;
          
          // Calculate early leave penalty
          const earlyMinutes = parseFloat(record.earlyDepartureMinutes || 0);
          const earlyLeavePenalty = earlyMinutes > 0
            ? Math.round(earlyMinutes * penaltyPerMinute * defaultEarlyLeavePenaltyRate)
            : 0;
          
          // Update record
          await knex('time_attendances')
            .where('id', record.id)
            .update({
              lateArrivalPenalty: lateArrivalPenalty,
              earlyLeavePenalty: earlyLeavePenalty,
              updated_at: knex.fn.now()
            });
          
          totalLatePenalty += lateArrivalPenalty;
          totalEarlyPenalty += earlyLeavePenalty;
          updated++;
          
        } catch (err) {
          console.error(`   ❌ Error updating record ${record.id}:`, err.message);
          throw err;
        }
      }
      
      console.log(`   ✓ Processed ${Math.min(i + batchSize, records.length)} / ${records.length} records`);
    }

    console.log(`\n✅ Updated ${updated} records with penalties!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total late penalty: ${totalLatePenalty.toLocaleString()} VNĐ`);
    console.log(`   Total early penalty: ${totalEarlyPenalty.toLocaleString()} VNĐ`);
    console.log(`   Total penalties: ${(totalLatePenalty + totalEarlyPenalty).toLocaleString()} VNĐ`);

    // 5. Show sample records
    const samples = await knex('time_attendances')
      .where('lateMinutes', '>', 0)
      .orWhere('earlyDepartureMinutes', '>', 0)
      .select('userId', 'date', 'lateMinutes', 'lateArrivalPenalty', 'earlyDepartureMinutes', 'earlyLeavePenalty')
      .limit(5);

    console.log(`\n📋 Sample records with penalties:`);
    samples.forEach((s, idx) => {
      console.log(`\n${idx + 1}. User ${s.userId} - ${s.date.toISOString().split('T')[0]}`);
      if (s.lateMinutes > 0) {
        console.log(`   Late: ${s.lateMinutes}min → ${s.lateArrivalPenalty.toLocaleString()} VNĐ`);
      }
      if (s.earlyDepartureMinutes > 0) {
        console.log(`   Early: ${s.earlyDepartureMinutes}min → ${s.earlyLeavePenalty.toLocaleString()} VNĐ`);
      }
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};
