/**
 * Seed file: Employee Salary Profiles for 100 Employees  
 * Tạo hồ sơ lương cho 100 nhân viên - lấy thông tin salary từ contracts
 */

exports.seed = async function(knex) {
  await knex('employee_salary_profiles').del();

  // Kết nối đến employee database để lấy contracts
  const employeeKnex = require('knex')({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      database: 'employee_service',
      port: process.env.DB_PORT || 5432
    }
  });

  try {
    // Lấy tất cả contracts từ employee database
    const contracts = await employeeKnex('contracts')
      .whereNot('userId', 1)
      .select('id', 'userId', 'startDate', 'salary');
    
    const salaryProfiles = contracts.map(contract => {
      const baseSalary = parseFloat(contract.salary) || 15000000;
      const insuranceSalary = Math.min(baseSalary, 36000000); // Tối đa 36 triệu theo quy định
      
      return {
        user_id: contract.userId.toString(),
        contract_id: contract.id,
        base_salary: baseSalary,
        insurance_salary: insuranceSalary,
        allowances: JSON.stringify([]),
        tax_deductions: JSON.stringify([]),
        effective_date: contract.startDate,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    await knex('employee_salary_profiles').insert(salaryProfiles);
    console.log(`✅ Đã tạo ${salaryProfiles.length} salary profiles cho nhân viên (từ contracts)`);
    
  } finally {
    await employeeKnex.destroy();
  }
};
