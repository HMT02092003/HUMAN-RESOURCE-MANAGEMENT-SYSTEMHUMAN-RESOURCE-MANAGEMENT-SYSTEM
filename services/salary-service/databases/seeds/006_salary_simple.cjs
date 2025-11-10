/**
 * Seed file: Employee Salary Profiles for 100 Employees
 * Tạo hồ sơ lương cho 100 nhân viên dựa trên chevron coefficient
 */

exports.seed = async function(knex) {
  await knex('employee_salary_profiles').del();

  // Kết nối đến database khác
  const authKnex = require('knex')({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456',
      database: 'auth_service',
      port: process.env.DB_PORT || 5432
    }
  });

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
    // Lấy users với chevronId từ auth_service
    const users = await authKnex('users')
      .whereNot('id', 1)
      .select('id', 'chevronId');

    // Lấy chevrons với coefficient từ employee_service
    const chevrons = await employeeKnex('chevrons').select('id', 'chevronCoefficient');
    const chevronMap = {};
    chevrons.forEach(ch => {
      chevronMap[ch.id] = ch.chevronCoefficient;
    });

    // Lấy contracts từ employee_service
    const contracts = await employeeKnex('contracts')
      .whereNot('userId', 1)
      .select('id', 'userId');
    const contractMap = {};
    contracts.forEach(c => {
      contractMap[c.userId] = c.id;
    });

    // Mức lương cơ bản: 10 triệu
    const BASE_SALARY = 10000000;

    const salaryProfiles = users.map(user => {
      const coefficient = chevronMap[user.chevronId] || 1.0;
      const baseSalary = Math.round(BASE_SALARY * coefficient);
      
      return {
        user_id: user.id.toString(),
        contract_id: contractMap[user.id],
        base_salary: baseSalary,
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    await knex('employee_salary_profiles').insert(salaryProfiles);
    console.log(`✅ Đã tạo ${salaryProfiles.length} salary profiles (dựa trên chevron coefficient)`);
    
  } finally {
    await authKnex.destroy();
    await employeeKnex.destroy();
  }
};
