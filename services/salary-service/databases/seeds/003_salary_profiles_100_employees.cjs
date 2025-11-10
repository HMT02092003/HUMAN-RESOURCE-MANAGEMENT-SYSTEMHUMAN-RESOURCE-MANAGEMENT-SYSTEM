/**
 * Seed file: Employee Salary Profiles for 100 Employees
 * Tạo hồ sơ lương cho 100 nhân viên dựa trên hợp đồng
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ (giữ lại salary profile của admin nếu có)
  await knex('employee_salary_profiles').where('user_id', '>', '1').del();

  const salaryProfiles = [];
  
  // Lấy danh sách contracts để map với user_id
  const contracts = await knex('contracts').select('id', 'userId', 'startDate').whereNot('userId', 1);
  
  // Tạo map userId -> contractId
  const userContractMap = {};
  contracts.forEach(contract => {
    userContractMap[contract.userId] = contract.id;
  });

  // Hàm tính insurance_salary (thường bằng 100% base_salary, tối đa 36 triệu theo quy định)
  const calculateInsuranceSalary = (baseSalary) => {
    return Math.min(baseSalary, 36000000);
  };

  // === BAN GIÁM ĐỐC (userId 2-6) ===
  for (let userId = 2; userId <= 6; userId++) {
    const baseSalaries = {
      2: 50000000, // CEO
      3: 35000000, // Giám đốc
      4: 35000000,
      5: 35000000,
      6: 35000000
    };
    const baseSalary = baseSalaries[userId];
    
    salaryProfiles.push({
      user_id: userId.toString(),
      contract_id: userContractMap[userId],
      base_salary: baseSalary,
      insurance_salary: calculateInsuranceSalary(baseSalary),
      tax_code: `TAX${userId.toString().padStart(8, '0')}`,
      bank_info: JSON.stringify({
        bank_name: 'Vietcombank',
        account_number: `0011${userId.toString().padStart(6, '0')}`,
        account_holder: `User ${userId}`
      }),
      effective_from: new Date('2020-01-15'),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG CÔNG NGHỆ (userId 7-31) ===
  const techSalaries = {
    7: 25000000,   // Trưởng phòng
    8: 22000000,   // Phó phòng
    9: 18000000,   // Team Leader
    10: 18000000,
    11: 18000000,
    12: 16000000,  // Chuyên viên cao cấp
    13: 16000000,
    14: 16000000,
    15: 16000000,
    16: 16000000,
    17: 13000000,  // Chuyên viên
    18: 13000000,
    19: 13000000,
    20: 13000000,
    21: 13000000,
    22: 13000000,
    23: 13000000,
    24: 13000000,
    25: 10000000,  // Nhân viên
    26: 10000000,
    27: 10000000,
    28: 10000000,
    29: 10000000,
    30: 5000000,   // Thực tập sinh
    31: 5000000
  };

  for (let userId = 7; userId <= 31; userId++) {
    const baseSalary = techSalaries[userId];
    const startDates = {
      7: '2021-01-10', 8: '2021-01-10',
      9: '2021-06-01', 10: '2021-06-01', 11: '2021-06-01',
      12: '2022-01-10', 13: '2022-01-10', 14: '2022-01-10', 15: '2022-01-10', 16: '2022-01-10',
      17: '2022-06-01', 18: '2022-06-01', 19: '2022-06-01', 20: '2022-06-01', 
      21: '2022-06-01', 22: '2022-06-01', 23: '2022-06-01', 24: '2022-06-01',
      25: '2023-03-01', 26: '2023-03-01', 27: '2023-03-01', 28: '2023-03-01', 29: '2023-03-01',
      30: '2024-09-01', 31: '2024-09-01'
    };
    
    salaryProfiles.push({
      user_id: userId.toString(),
      contract_id: userContractMap[userId],
      base_salary: baseSalary,
      insurance_salary: calculateInsuranceSalary(baseSalary),
      tax_code: `TAX${userId.toString().padStart(8, '0')}`,
      bank_info: JSON.stringify({
        bank_name: 'Techcombank',
        account_number: `0021${userId.toString().padStart(6, '0')}`,
        account_holder: `User ${userId}`
      }),
      effective_from: new Date(startDates[userId]),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG KINH DOANH (userId 32-56) ===
  const salesSalaries = {
    32: 24000000,  // Trưởng phòng
    33: 21000000,  // Phó phòng
    34: 17000000,  // Team Leader
    35: 17000000,
    36: 17000000
  };
  
  // Nhân viên kinh doanh (37-51)
  for (let i = 37; i <= 51; i++) {
    salesSalaries[i] = 9000000;
  }
  
  // Thực tập sinh (52-56)
  for (let i = 52; i <= 56; i++) {
    salesSalaries[i] = 4500000;
  }

  for (let userId = 32; userId <= 56; userId++) {
    const startDates = {};
    for (let i = 32; i <= 33; i++) startDates[i] = '2021-02-01';
    for (let i = 34; i <= 36; i++) startDates[i] = '2021-08-01';
    for (let i = 37; i <= 51; i++) startDates[i] = '2022-03-01';
    for (let i = 52; i <= 56; i++) startDates[i] = '2024-09-01';
    
    salaryProfiles.push({
      user_id: userId.toString(),
      contract_id: userContractMap[userId],
      base_salary: salesSalaries[userId],
      insurance_salary: calculateInsuranceSalary(salesSalaries[userId]),
      tax_code: `TAX${userId.toString().padStart(8, '0')}`,
      bank_info: JSON.stringify({
        bank_name: 'ACB',
        account_number: `0031${userId.toString().padStart(6, '0')}`,
        account_holder: `User ${userId}`
      }),
      effective_from: new Date(startDates[userId]),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG MARKETING (userId 57-71) ===
  const mktSalaries = {
    57: 23000000,  // Trưởng phòng
    58: 20000000,  // Phó phòng
    59: 16000000,  // Team Leader
    60: 16000000
  };
  
  // Chuyên viên (61-68)
  for (let i = 61; i <= 68; i++) {
    mktSalaries[i] = 11000000;
  }
  
  // Thực tập sinh (69-71)
  for (let i = 69; i <= 71; i++) {
    mktSalaries[i] = 4000000;
  }

  for (let userId = 57; userId <= 71; userId++) {
    const startDates = {};
    for (let i = 57; i <= 58; i++) startDates[i] = '2021-03-01';
    for (let i = 59; i <= 60; i++) startDates[i] = '2021-09-01';
    for (let i = 61; i <= 68; i++) startDates[i] = '2022-06-01';
    for (let i = 69; i <= 71; i++) startDates[i] = '2024-09-01';
    
    salaryProfiles.push({
      user_id: userId.toString(),
      contract_id: userContractMap[userId],
      base_salary: mktSalaries[userId],
      insurance_salary: calculateInsuranceSalary(mktSalaries[userId]),
      tax_code: `TAX${userId.toString().padStart(8, '0')}`,
      bank_info: JSON.stringify({
        bank_name: 'VPBank',
        account_number: `0041${userId.toString().padStart(6, '0')}`,
        account_holder: `User ${userId}`
      }),
      effective_from: new Date(startDates[userId]),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG TÀI CHÍNH (userId 72-86) ===
  const financeSalaries = {
    72: 24000000,  // Trưởng phòng
    73: 21000000,  // Phó phòng
    74: 15000000,  // Chuyên viên cao cấp
    75: 15000000,
    76: 15000000
  };
  
  // Nhân viên (77-84)
  for (let i = 77; i <= 84; i++) {
    financeSalaries[i] = 10000000;
  }
  
  // Thực tập sinh (85-86)
  for (let i = 85; i <= 86; i++) {
    financeSalaries[i] = 4500000;
  }

  for (let userId = 72; userId <= 86; userId++) {
    const startDates = {};
    for (let i = 72; i <= 73; i++) startDates[i] = '2020-08-01';
    for (let i = 74; i <= 76; i++) startDates[i] = '2021-07-01';
    for (let i = 77; i <= 84; i++) startDates[i] = '2022-05-01';
    for (let i = 85; i <= 86; i++) startDates[i] = '2024-09-01';
    
    salaryProfiles.push({
      user_id: userId.toString(),
      contract_id: userContractMap[userId],
      base_salary: financeSalaries[userId],
      insurance_salary: calculateInsuranceSalary(financeSalaries[userId]),
      tax_code: `TAX${userId.toString().padStart(8, '0')}`,
      bank_info: JSON.stringify({
        bank_name: 'Sacombank',
        account_number: `0051${userId.toString().padStart(6, '0')}`,
        account_holder: `User ${userId}`
      }),
      effective_from: new Date(startDates[userId]),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG NHÂN SỰ (userId 87-101) ===
  const hrSalaries = {
    87: 22000000,  // Trưởng phòng
    88: 19000000,  // Phó phòng
    89: 14000000,  // Chuyên viên cao cấp
    90: 14000000
  };
  
  // Nhân viên (91-99)
  for (let i = 91; i <= 99; i++) {
    hrSalaries[i] = 9500000;
  }
  
  // Thực tập sinh (100-101)
  for (let i = 100; i <= 101; i++) {
    hrSalaries[i] = 4000000;
  }

  for (let userId = 87; userId <= 101; userId++) {
    const startDates = {};
    for (let i = 87; i <= 88; i++) startDates[i] = '2020-09-01';
    for (let i = 89; i <= 90; i++) startDates[i] = '2021-08-01';
    for (let i = 91; i <= 99; i++) startDates[i] = '2022-07-01';
    for (let i = 100; i <= 101; i++) startDates[i] = '2024-09-01';
    
    salaryProfiles.push({
      user_id: userId.toString(),
      contract_id: userContractMap[userId],
      base_salary: hrSalaries[userId],
      insurance_salary: calculateInsuranceSalary(hrSalaries[userId]),
      tax_code: `TAX${userId.toString().padStart(8, '0')}`,
      bank_info: JSON.stringify({
        bank_name: 'MB Bank',
        account_number: `0061${userId.toString().padStart(6, '0')}`,
        account_holder: `User ${userId}`
      }),
      effective_from: new Date(startDates[userId]),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Insert tất cả salary profiles
  await knex('employee_salary_profiles').insert(salaryProfiles);
  
  // Reset sequence
  await knex.raw("SELECT setval('employee_salary_profiles_id_seq', (SELECT MAX(id) FROM employee_salary_profiles))");
  
  console.log(`✅ Đã tạo ${salaryProfiles.length} hồ sơ lương cho 100 nhân viên`);
};
