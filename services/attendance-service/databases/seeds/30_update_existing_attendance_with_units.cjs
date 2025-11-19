/**
 * Seed: Update existing attendance data with working units calculation
 * Cập nhật dữ liệu chấm công cũ để tính công theo logic mới
 */

exports.seed = async function(knex) {
  console.log('🔄 Updating existing attendance records with working units...\n');
  
  try {
    // 1. Get OT rate settings
    const otRateSetting = await knex('settings')
      .where('key', 'OvertimeRateInUnits')
      .first();
    
    const holidayOtRateSetting = await knex('settings')
      .where('key', 'HolidayOvertimeRateInUnits')
      .first();
    
    let otRate = 1.5;
    let holidayOtRate = 3.0;
    
    if (otRateSetting && otRateSetting.value) {
      try {
        const parsed = typeof otRateSetting.value === 'string' 
          ? JSON.parse(otRateSetting.value) 
          : otRateSetting.value;
        otRate = parsed.rate || 1.5;
      } catch (e) {
        console.log('   ⚠️  Could not parse OvertimeRateInUnits, using default 1.5');
      }
    }
    
    if (holidayOtRateSetting && holidayOtRateSetting.value) {
      try {
        const parsed = typeof holidayOtRateSetting.value === 'string'
          ? JSON.parse(holidayOtRateSetting.value)
          : holidayOtRateSetting.value;
        holidayOtRate = parsed.rate || 3.0;
      } catch (e) {
        console.log('   ⚠️  Could not parse HolidayOvertimeRateInUnits, using default 3.0');
      }
    }
    
    console.log(`⚙️  OT Rates: Regular=${otRate}, Holiday=${holidayOtRate}`);
    
    // 2. Get all holidays
    const holidays = await knex('holidays')
      .select('start_date', 'end_date');
    
    const holidayDates = new Set();
    holidays.forEach(h => {
      let current = new Date(h.start_date);
      const end = new Date(h.end_date);
      while (current <= end) {
        holidayDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });
    
    console.log(`📅 Loaded ${holidayDates.size} holiday dates\n`);
    
    // 3. Get default shift
    const defaultShift = await knex('shifts')
      .where('is_default', true)
      .first();
    
    if (!defaultShift) {
      console.error('❌ No default shift found!');
      return;
    }
    
    console.log(`✅ Default shift: ${defaultShift.name} (${defaultShift.start_time} - ${defaultShift.end_time})`);
    console.log(`   Working unit: ${defaultShift.working_unit}\n`);
    
    // 4. Get all attendance records that need update
    // IMPORTANT: Check for dailyWorkingUnit = 0 or null to update missing field
    const records = await knex('time_attendances')
      .whereNotNull('checkInTime')
      .whereNotNull('checkOutTime')
      .where(function() {
        this.whereNull('dailyWorkingUnit')
          .orWhere('dailyWorkingUnit', 0)
          .orWhereNull('totalWorkingUnit')
          .orWhere('totalWorkingUnit', 0);
      })
      .select('id', 'userId', 'date', 'checkInTime', 'checkOutTime', 'dailyTotalWorkHours');
    
    console.log(`📊 Found ${records.length} records to update\n`);
    
    if (records.length === 0) {
      console.log('✅ All records already have working units calculated!');
      return;
    }
    
    // 5. Process in batches
    const batchSize = 100;
    let updated = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Get user's shift for this date (or use default)
          let shift = await knex('employee_schedules')
            .where('user_id', record.userId)
            .where('date', record.date)
            .where('status', 'approved')
            .first();
          
          if (!shift) {
            shift = defaultShift;
          } else {
            // Get shift details
            const shiftDetails = await knex('shifts')
              .where('id', shift.shift_id)
              .first();
            shift = shiftDetails || defaultShift;
          }
          
          // Calculate work hours
          const checkIn = new Date(record.checkInTime);
          const checkOut = new Date(record.checkOutTime);
          const workHours = (checkOut - checkIn) / (1000 * 60 * 60);
          
          // Standard hours from shift
          const [startHour, startMin] = shift.start_time.split(':').map(Number);
          const [endHour, endMin] = shift.end_time.split(':').map(Number);
          const standardHours = (endHour + endMin/60) - (startHour + startMin/60);
          
          // Lunch break
          const lunchBreak = 1;
          const actualWorkHours = Math.max(0, workHours - lunchBreak);
          
          // Calculate daily working unit
          const dailyWorkingUnit = Math.min(1, actualWorkHours / standardHours) * shift.working_unit;
          
          // Calculate OT
          let otWorkingUnit = 0;
          if (actualWorkHours > standardHours) {
            const otHours = actualWorkHours - standardHours;
            const dateStr = record.date.toISOString ? record.date.toISOString().split('T')[0] : record.date;
            const isHoliday = holidayDates.has(dateStr);
            const currentOtRate = isHoliday ? holidayOtRate : otRate;
            otWorkingUnit = (otHours / 8) * currentOtRate;
          }
          
          const totalWorkingUnit = dailyWorkingUnit + otWorkingUnit;
          
          // Update record
          try {
            await knex('time_attendances')
              .where('id', record.id)
              .update({
                dailyTotalWorkHours: actualWorkHours.toFixed(2),
                dailyWorkingUnit: dailyWorkingUnit.toFixed(4), // FIXED: Added missing field
                totalWorkingUnit: totalWorkingUnit.toFixed(4),
                otWorkingUnit: otWorkingUnit.toFixed(4),
                updated_at: knex.fn.now()
              });
            
            updated++;
          } catch (updateErr) {
            throw new Error(`Failed to update record ${record.id} for user ${record.userId} on ${record.date}: ${updateErr.message}`);
          }
        } catch (err) {
          console.error(`   ❌ Error processing record ${record.id}:`, err.message);
          console.error(`      User: ${record.userId}, Date: ${record.date}`);
          throw err; // Re-throw to stop execution
        }
      }
      
      console.log(`   ✓ Processed ${Math.min(i + batchSize, records.length)} / ${records.length} records`);
    }
    
    console.log(`\n✅ Updated ${updated} attendance records with working units!`);
    
    // 6. Show summary statistics
    const stats = await knex('time_attendances')
      .select(
        knex.raw('COUNT(*) as total_records'),
        knex.raw('COUNT(DISTINCT "userId") as total_users'),
        knex.raw('SUM("totalWorkingUnit") as total_units'),
        knex.raw('SUM("otWorkingUnit") as total_ot_units')
      )
      .whereNotNull('totalWorkingUnit')
      .where('totalWorkingUnit', '>', 0)
      .first();
    
    console.log('\n📊 Summary Statistics:');
    console.log(`   - Total records with units: ${stats.total_records}`);
    console.log(`   - Total users: ${stats.total_users}`);
    console.log(`   - Total working units: ${parseFloat(stats.total_units || 0).toFixed(2)}`);
    console.log(`   - Total OT units: ${parseFloat(stats.total_ot_units || 0).toFixed(2)}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error updating attendance records:', error);
    throw error;
  }
};
