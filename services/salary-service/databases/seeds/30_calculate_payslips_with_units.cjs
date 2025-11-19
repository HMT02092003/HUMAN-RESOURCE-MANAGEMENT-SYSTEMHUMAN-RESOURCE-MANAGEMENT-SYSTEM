/**
 * Seed: Calculate payslips for all users based on working units
 * Tính lương cho tất cả users dựa trên công
 */

const axios = require('axios');

exports.seed = async function(knex) {
  console.log('💰 Calculating payslips for all users with working units...\n');
  
  try {
    // Configuration
    const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:4003';
    const API_GATEWAY = process.env.API_GATEWAY || 'http://localhost:4000';
    
    // 1. Get all months with monthly_attendances (from attendance DB)
    // We'll need to connect to attendance DB
    const attendanceDb = require('knex')({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '123456',
        database: 'attendance_service'
      }
    });
    
    const monthsData = await attendanceDb('monthly_attendances')
      .select('month')
      .where('isApproved', true) // Only approved months
      .groupBy('month')
      .orderBy('month', 'desc');
    
    console.log(`📅 Found ${monthsData.length} approved months\n`);
    
    if (monthsData.length === 0) {
      console.log('⚠️  No approved monthly attendances found. Please approve monthly summaries first.');
      await attendanceDb.destroy();
      return;
    }
    
    for (const { month } of monthsData) {
      console.log(`\n💵 Processing payslips for: ${month}`);
      console.log('─'.repeat(60));
      
      const [year, monthNum] = month.split('-').map(Number);
      
      // Get standard working days for this month
      let standardWorkingDays = 22; // Default
      try {
        const response = await axios.post(`${ATTENDANCE_SERVICE_URL}/api/calculate-standard-working-days`, {
          month: month
        }, { timeout: 5000 });
        
        if (response.data && response.data.standardWorkingDays) {
          standardWorkingDays = response.data.standardWorkingDays;
        }
      } catch (err) {
        console.log(`   ⚠️  Could not fetch working days, using default: 22`);
      }
      
      console.log(`   📊 Standard working days: ${standardWorkingDays}`);
      
      // Get all approved monthly attendances for this month
      const monthlyAttendances = await attendanceDb('monthly_attendances')
        .where('month', month)
        .where('isApproved', true)
        .select('*');
      
      console.log(`   👥 ${monthlyAttendances.length} users to process`);
      
      let processed = 0;
      let skipped = 0;
      
      for (const attendance of monthlyAttendances) {
        try {
          const userId = attendance.userId;
          
          // Get salary profile
          const profile = await knex('employee_salary_profiles')
            .where('user_id', userId.toString())
            .first();
          
          if (!profile) {
            console.log(`   ⚠️  No salary profile for user ${userId}, skipping`);
            skipped++;
            continue;
          }
          
          const baseSalary = parseFloat(profile.base_salary || 0);
          if (baseSalary === 0) {
            skipped++;
            continue;
          }
          
          // Get allowances
          const allowances = await knex('employee_salary_profile_allowances')
            .join('allowance_types', 'employee_salary_profile_allowances.allowance_type_id', 'allowance_types.id')
            .where('employee_salary_profile_allowances.employee_salary_profile_id', profile.id)
            .sum('allowance_types.default_amount as total');
          
          const allowancesSum = parseFloat(allowances[0]?.total || 0);
          
          // Get working units
          const totalWorkingUnits = parseFloat(attendance.totalWorkingUnits || 0);
          const totalOtWorkingUnits = parseFloat(attendance.totalOtWorkingUnits || 0);
          
          // Calculate salary
          const salaryPerUnit = baseSalary / standardWorkingDays;
          const salaryFromUnits = salaryPerUnit * totalWorkingUnits;
          const grossSalary = salaryFromUnits + allowancesSum;
          
          // Calculate insurance (on base salary)
          const socialInsurance = baseSalary * 0.08;
          const healthInsurance = baseSalary * 0.015;
          
          // Calculate tax (10% on base salary)
          const personalIncomeTax = baseSalary * 0.10;
          
          // Penalties from attendance
          const penaltyTotal = parseFloat(attendance.totalPenalty || 0);
          
          // Total deductions
          const totalDeductions = socialInsurance + healthInsurance + personalIncomeTax + penaltyTotal;
          
          // Net salary
          const netSalary = grossSalary - totalDeductions;
          
          // Insert or update payslip
          await knex('monthly_payslips')
            .insert({
              user_id: userId.toString(),
              year: year,
              month: monthNum,
              base_salary: baseSalary.toFixed(2),
              allowances: allowancesSum.toFixed(2),
              total_working_units: totalWorkingUnits.toFixed(4),
              total_ot_working_units: totalOtWorkingUnits.toFixed(4),
              standard_working_days: standardWorkingDays.toFixed(2),
              salary_per_unit: salaryPerUnit.toFixed(2),
              salary_from_units: salaryFromUnits.toFixed(2),
              overtime_pay: '0.00', // Deprecated
              gross_salary: grossSalary.toFixed(2),
              social_insurance: socialInsurance.toFixed(2),
              health_insurance: healthInsurance.toFixed(2),
              personal_income_tax: personalIncomeTax.toFixed(2),
              penalty_total: penaltyTotal.toFixed(2),
              total_deductions: totalDeductions.toFixed(2),
              net_salary: netSalary.toFixed(2),
              notes: `Bảng lương tháng ${monthNum}/${year}`,
              status: '1',
              created_at: knex.fn.now(),
              updated_at: knex.fn.now()
            })
            .onConflict(['user_id', 'year', 'month'])
            .merge({
              base_salary: baseSalary.toFixed(2),
              allowances: allowancesSum.toFixed(2),
              total_working_units: totalWorkingUnits.toFixed(4),
              total_ot_working_units: totalOtWorkingUnits.toFixed(4),
              standard_working_days: standardWorkingDays.toFixed(2),
              salary_per_unit: salaryPerUnit.toFixed(2),
              salary_from_units: salaryFromUnits.toFixed(2),
              gross_salary: grossSalary.toFixed(2),
              social_insurance: socialInsurance.toFixed(2),
              health_insurance: healthInsurance.toFixed(2),
              personal_income_tax: personalIncomeTax.toFixed(2),
              penalty_total: penaltyTotal.toFixed(2),
              total_deductions: totalDeductions.toFixed(2),
              net_salary: netSalary.toFixed(2),
              updated_at: knex.fn.now()
            });
          
          processed++;
          
        } catch (err) {
          console.error(`   ⚠️  Error processing user ${attendance.userId}:`, err.message);
        }
      }
      
      console.log(`   ✅ Processed: ${processed}, Skipped: ${skipped}`);
    }
    
    // Summary statistics
    console.log('\n' + '═'.repeat(60));
    console.log('📊 PAYSLIP SUMMARY');
    console.log('═'.repeat(60));
    
    const summary = await knex('monthly_payslips')
      .select(
        knex.raw('COUNT(*) as total_payslips'),
        knex.raw('COUNT(DISTINCT user_id) as total_users'),
        knex.raw('SUM(CAST(gross_salary AS NUMERIC)) as total_gross'),
        knex.raw('SUM(CAST(net_salary AS NUMERIC)) as total_net'),
        knex.raw('AVG(CAST(total_working_units AS NUMERIC)) as avg_units')
      )
      .first();
    
    console.log(`\n   Total payslips: ${summary.total_payslips}`);
    console.log(`   Total users: ${summary.total_users}`);
    console.log(`   Total gross salary: ${parseFloat(summary.total_gross || 0).toLocaleString('vi-VN')} VNĐ`);
    console.log(`   Total net salary: ${parseFloat(summary.total_net || 0).toLocaleString('vi-VN')} VNĐ`);
    console.log(`   Avg working units: ${parseFloat(summary.avg_units || 0).toFixed(2)}`);
    
    // Sample payslip
    const sample = await knex('monthly_payslips')
      .orderBy('created_at', 'desc')
      .first();
    
    if (sample) {
      console.log(`\n   📋 Sample Payslip (User ${sample.user_id}):`);
      console.log(`      Period: ${sample.month}/${sample.year}`);
      console.log(`      Base salary: ${parseFloat(sample.base_salary).toLocaleString('vi-VN')} VNĐ`);
      console.log(`      Working units: ${parseFloat(sample.total_working_units).toFixed(4)}`);
      console.log(`      Salary per unit: ${parseFloat(sample.salary_per_unit).toLocaleString('vi-VN')} VNĐ`);
      console.log(`      Gross: ${parseFloat(sample.gross_salary).toLocaleString('vi-VN')} VNĐ`);
      console.log(`      Net: ${parseFloat(sample.net_salary).toLocaleString('vi-VN')} VNĐ`);
    }
    
    console.log('\n✅ Payslips calculated successfully!\n');
    
    // Cleanup
    await attendanceDb.destroy();
    
  } catch (error) {
    console.error('❌ Error calculating payslips:', error);
    throw error;
  }
};
