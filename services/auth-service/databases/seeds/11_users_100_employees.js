/**
 * Seed file: 100 Users (Người dùng)
 * Tạo 100 nhân viên phân bố đều qua 6 phòng ban
 * Bao gồm: Ban Giám đốc, Công nghệ, Kinh doanh, Marketing, Tài chính, Nhân sự
 */

import bcrypt from 'bcryptjs';

export async function seed(knex) {
  // Xóa dữ liệu cũ (giữ lại admin với id=1)
  await knex('users').whereNot('id', 1).del();

  const hashedPassword = await bcrypt.hash('123456', 10);
  
  // Danh sách tên Việt Nam
  const firstNames = ['An', 'Bình', 'Chi', 'Dũng', 'Đức', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hoa', 
                      'Hùng', 'Hương', 'Khoa', 'Khánh', 'Lan', 'Linh', 'Long', 'Mai', 'Minh', 'Nam',
                      'Nga', 'Ngọc', 'Nhung', 'Phong', 'Phúc', 'Quân', 'Quyên', 'Sang', 'Sơn', 'Tâm',
                      'Thanh', 'Thảo', 'Thủy', 'Tiến', 'Trung', 'Tú', 'Tuấn', 'Tùng', 'Uyên', 'Văn',
                      'Vinh', 'Vũ', 'Xuân', 'Yến', 'Ý'];
  
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi',
                     'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];

  // Phân bố phòng ban và chức vụ
  // Phòng ban: 1=BGĐ, 2=Công nghệ, 3=Kinh doanh, 4=Marketing, 5=Tài chính, 6=Nhân sự
  // Chức vụ: 1=CEO, 2=Giám đốc, 3=Trưởng phòng, 4=Phó phòng, 5=Team Leader, 
  //          6=Chuyên viên cao cấp, 7=Chuyên viên, 8=Nhân viên, 9=Nhân viên sơ cấp, 10=Thực tập sinh
  
  const users = [];
  let userId = 2; // Bắt đầu từ 2 (id=1 là admin)

  // === BAN GIÁM ĐỐC (5 người) ===
  // 1 CEO
  users.push({
    id: userId++,
    username: `ceo001`,
    password: hashedPassword,
    firstName: 'Minh',
    lastName: 'Nguyễn Văn',
    email: `minh.nguyen@company.com`,
    startDate: new Date('2020-01-15'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 2 }),
    chevronId: 1, // CEO
    departmentId: 1, // Ban Giám đốc
    status: 'active',
    roleId: 3, // Quản lý
    vacationDay: 20,
    salary: 50000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 4 Giám đốc
  const directors = ['Công nghệ', 'Kinh doanh', 'Tài chính', 'Marketing'];
  directors.forEach((dept, idx) => {
    users.push({
      id: userId++,
      username: `director00${idx + 1}`,
      password: hashedPassword,
      firstName: firstNames[idx],
      lastName: lastNames[idx],
      email: `${firstNames[idx].toLowerCase()}.${lastNames[idx].toLowerCase()}@company.com`,
      startDate: new Date('2020-06-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: idx % 2 === 0, children: idx % 3 }),
      chevronId: 2, // Giám đốc
      departmentId: 1, // Ban Giám đốc
      status: 'active',
      roleId: 3, // Quản lý
      vacationDay: 18,
      salary: 35000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  // === PHÒNG CÔNG NGHỆ (25 người) ===
  // 1 Trưởng phòng
  users.push({
    id: userId++,
    username: `tech_manager`,
    password: hashedPassword,
    firstName: 'Tuấn',
    lastName: 'Lê Văn',
    email: `tuan.le@company.com`,
    startDate: new Date('2021-01-10'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 1 }),
    chevronId: 3, // Trưởng phòng
    departmentId: 2, // Công nghệ
    status: 'active',
    roleId: 3, // Quản lý
    vacationDay: 15,
    salary: 25000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 1 Phó phòng
  users.push({
    id: userId++,
    username: `tech_deputy`,
    password: hashedPassword,
    firstName: 'Hương',
    lastName: 'Trần Thị',
    email: `huong.tran@company.com`,
    startDate: new Date('2021-03-15'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: false, children: 0 }),
    chevronId: 4, // Phó phòng
    departmentId: 2,
    status: 'active',
    roleId: 3, // Quản lý
    vacationDay: 15,
    salary: 22000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 3 Team Leader
  for (let i = 0; i < 3; i++) {
    users.push({
      id: userId++,
      username: `tech_tl${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[10 + i],
      lastName: lastNames[5 + i],
      email: `tech.tl${i + 1}@company.com`,
      startDate: new Date('2021-06-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i % 2 === 0, children: i % 2 }),
      chevronId: 5, // Team Leader
      departmentId: 2,
      status: 'active',
      roleId: 3, // Quản lý
      vacationDay: 14,
      salary: 18000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 5 Chuyên viên cao cấp (Senior)
  for (let i = 0; i < 5; i++) {
    users.push({
      id: userId++,
      username: `tech_senior${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[15 + i],
      lastName: lastNames[i],
      email: `tech.senior${i + 1}@company.com`,
      startDate: new Date('2022-01-10'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: false, children: 0 }),
      chevronId: 6, // Chuyên viên cao cấp
      departmentId: 2,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 14,
      salary: 16000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 8 Chuyên viên
  for (let i = 0; i < 8; i++) {
    users.push({
      id: userId++,
      username: `tech_dev${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[20 + i],
      lastName: lastNames[(i + 2) % 15],
      email: `tech.dev${i + 1}@company.com`,
      startDate: new Date('2022-06-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i % 3 === 0, children: 0 }),
      chevronId: 7, // Chuyên viên
      departmentId: 2,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 12,
      salary: 13000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 5 Nhân viên
  for (let i = 0; i < 5; i++) {
    users.push({
      id: userId++,
      username: `tech_staff${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[30 + i],
      lastName: lastNames[(i + 5) % 15],
      email: `tech.staff${i + 1}@company.com`,
      startDate: new Date('2023-03-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: false, children: 0 }),
      chevronId: 8, // Nhân viên
      departmentId: 2,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 12,
      salary: 10000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 2 Thực tập sinh
  for (let i = 0; i < 2; i++) {
    users.push({
      id: userId++,
      username: `tech_intern${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[35 + i],
      lastName: lastNames[(i + 8) % 15],
      email: `tech.intern${i + 1}@company.com`,
      startDate: new Date('2024-09-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: false, children: 0 }),
      chevronId: 10, // Thực tập sinh
      departmentId: 2,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 12,
      salary: 5000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // === PHÒNG KINH DOANH (25 người) ===
  // 1 Trưởng phòng
  users.push({
    id: userId++,
    username: `sales_manager`,
    password: hashedPassword,
    firstName: 'Hải',
    lastName: 'Phạm Đức',
    email: `hai.pham@company.com`,
    startDate: new Date('2021-02-01'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 2 }),
    chevronId: 3, // Trưởng phòng
    departmentId: 3, // Kinh doanh
    status: 'active',
    roleId: 3, // Quản lý
    vacationDay: 15,
    salary: 24000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 1 Phó phòng
  users.push({
    id: userId++,
    username: `sales_deputy`,
    password: hashedPassword,
    firstName: 'Lan',
    lastName: 'Hoàng Thị',
    email: `lan.hoang@company.com`,
    startDate: new Date('2021-04-01'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 1 }),
    chevronId: 4, // Phó phòng
    departmentId: 3,
    status: 'active',
    roleId: 3, // Quản lý
    vacationDay: 15,
    salary: 21000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 3 Team Leader
  for (let i = 0; i < 3; i++) {
    users.push({
      id: userId++,
      username: `sales_tl${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[i + 5],
      lastName: lastNames[(i + 3) % 15],
      email: `sales.tl${i + 1}@company.com`,
      startDate: new Date('2021-08-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i === 0, children: i === 0 ? 1 : 0 }),
      chevronId: 5, // Team Leader
      departmentId: 3,
      status: 'active',
      roleId: 3, // Quản lý
      vacationDay: 14,
      salary: 17000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 15 Nhân viên kinh doanh
  for (let i = 0; i < 15; i++) {
    users.push({
      id: userId++,
      username: `sales_staff${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 10) % 45],
      lastName: lastNames[(i + 6) % 15],
      email: `sales.staff${i + 1}@company.com`,
      startDate: new Date('2022-03-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i % 4 === 0, children: i % 5 === 0 ? 1 : 0 }),
      chevronId: 8, // Nhân viên
      departmentId: 3,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 12,
      salary: 9000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 5 Thực tập sinh
  for (let i = 0; i < 5; i++) {
    users.push({
      id: userId++,
      username: `sales_intern${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 25) % 45],
      lastName: lastNames[(i + 10) % 15],
      email: `sales.intern${i + 1}@company.com`,
      startDate: new Date('2024-09-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: false, children: 0 }),
      chevronId: 10, // Thực tập sinh
      departmentId: 3,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 12,
      salary: 4500000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // === PHÒNG MARKETING (15 người) ===
  // 1 Trưởng phòng
  users.push({
    id: userId++,
    username: `mkt_manager`,
    password: hashedPassword,
    firstName: 'Thảo',
    lastName: 'Phan Thị',
    email: `thao.phan@company.com`,
    startDate: new Date('2021-03-01'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 1 }),
    chevronId: 3, // Trưởng phòng
    departmentId: 4, // Marketing
    status: 'active',
    roleId: 3, // Quản lý
    vacationDay: 15,
    salary: 23000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 1 Phó phòng
  users.push({
    id: userId++,
    username: `mkt_deputy`,
    password: hashedPassword,
    firstName: 'Quân',
    lastName: 'Vũ Minh',
    email: `quan.vu@company.com`,
    startDate: new Date('2021-05-15'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: false, children: 0 }),
    chevronId: 4, // Phó phòng
    departmentId: 4,
    status: 'active',
    roleId: 3, // Quản lý
    vacationDay: 15,
    salary: 20000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 2 Team Leader
  for (let i = 0; i < 2; i++) {
    users.push({
      id: userId++,
      username: `mkt_tl${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 15) % 45],
      lastName: lastNames[(i + 7) % 15],
      email: `mkt.tl${i + 1}@company.com`,
      startDate: new Date('2021-09-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i === 0, children: 0 }),
      chevronId: 5, // Team Leader
      departmentId: 4,
      status: 'active',
      roleId: 3, // Quản lý
      vacationDay: 14,
      salary: 16000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 8 Chuyên viên Marketing
  for (let i = 0; i < 8; i++) {
    users.push({
      id: userId++,
      username: `mkt_staff${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 20) % 45],
      lastName: lastNames[(i + 9) % 15],
      email: `mkt.staff${i + 1}@company.com`,
      startDate: new Date('2022-06-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i % 3 === 0, children: 0 }),
      chevronId: 7, // Chuyên viên
      departmentId: 4,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 12,
      salary: 11000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 3 Thực tập sinh
  for (let i = 0; i < 3; i++) {
    users.push({
      id: userId++,
      username: `mkt_intern${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 30) % 45],
      lastName: lastNames[(i + 11) % 15],
      email: `mkt.intern${i + 1}@company.com`,
      startDate: new Date('2024-09-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: false, children: 0 }),
      chevronId: 10, // Thực tập sinh
      departmentId: 4,
      status: 'active',
      roleId: 2, // Nhân viên
      vacationDay: 12,
      salary: 4000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // === PHÒNG TÀI CHÍNH (15 người) ===
  // 1 Trưởng phòng
  users.push({
    id: userId++,
    username: `finance_manager`,
    password: hashedPassword,
    firstName: 'Nga',
    lastName: 'Đỗ Thị',
    email: `nga.do@company.com`,
    startDate: new Date('2020-08-01'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 2 }),
    chevronId: 3, // Trưởng phòng
    departmentId: 5, // Tài chính
    status: 'active',
    roleId: 4, // Kế toán
    vacationDay: 15,
    salary: 24000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 1 Phó phòng
  users.push({
    id: userId++,
    username: `finance_deputy`,
    password: hashedPassword,
    firstName: 'Khoa',
    lastName: 'Bùi Văn',
    email: `khoa.bui@company.com`,
    startDate: new Date('2021-01-15'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 1 }),
    chevronId: 4, // Phó phòng
    departmentId: 5,
    status: 'active',
    roleId: 4, // Kế toán
    vacationDay: 15,
    salary: 21000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 3 Chuyên viên cao cấp
  for (let i = 0; i < 3; i++) {
    users.push({
      id: userId++,
      username: `finance_senior${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 12) % 45],
      lastName: lastNames[(i + 4) % 15],
      email: `finance.senior${i + 1}@company.com`,
      startDate: new Date('2021-07-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i % 2 === 0, children: i % 2 }),
      chevronId: 6, // Chuyên viên cao cấp
      departmentId: 5,
      status: 'active',
      roleId: 4, // Kế toán
      vacationDay: 14,
      salary: 15000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 8 Nhân viên kế toán
  for (let i = 0; i < 8; i++) {
    users.push({
      id: userId++,
      username: `finance_staff${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 25) % 45],
      lastName: lastNames[(i + 8) % 15],
      email: `finance.staff${i + 1}@company.com`,
      startDate: new Date('2022-05-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i % 3 === 0, children: 0 }),
      chevronId: 8, // Nhân viên
      departmentId: 5,
      status: 'active',
      roleId: 4, // Kế toán
      vacationDay: 12,
      salary: 10000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 2 Thực tập sinh
  for (let i = 0; i < 2; i++) {
    users.push({
      id: userId++,
      username: `finance_intern${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 35) % 45],
      lastName: lastNames[(i + 12) % 15],
      email: `finance.intern${i + 1}@company.com`,
      startDate: new Date('2024-09-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: false, children: 0 }),
      chevronId: 10, // Thực tập sinh
      departmentId: 5,
      status: 'active',
      roleId: 4, // Kế toán
      vacationDay: 12,
      salary: 4500000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // === PHÒNG NHÂN SỰ (15 người) ===
  // 1 Trưởng phòng
  users.push({
    id: userId++,
    username: `hr_manager`,
    password: hashedPassword,
    firstName: 'Linh',
    lastName: 'Ngô Thị',
    email: `linh.ngo@company.com`,
    startDate: new Date('2020-09-01'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: true, children: 1 }),
    chevronId: 3, // Trưởng phòng
    departmentId: 6, // Nhân sự
    status: 'active',
    roleId: 5, // HR
    vacationDay: 15,
    salary: 22000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 1 Phó phòng
  users.push({
    id: userId++,
    username: `hr_deputy`,
    password: hashedPassword,
    firstName: 'Dũng',
    lastName: 'Lý Văn',
    email: `dung.ly@company.com`,
    startDate: new Date('2021-02-01'),
    dayOff: null,
    profileFamily: JSON.stringify({ married: false, children: 0 }),
    chevronId: 4, // Phó phòng
    departmentId: 6,
    status: 'active',
    roleId: 5, // HR
    vacationDay: 15,
    salary: 19000000,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 2 Chuyên viên cao cấp
  for (let i = 0; i < 2; i++) {
    users.push({
      id: userId++,
      username: `hr_senior${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 18) % 45],
      lastName: lastNames[(i + 6) % 15],
      email: `hr.senior${i + 1}@company.com`,
      startDate: new Date('2021-08-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i === 0, children: i === 0 ? 1 : 0 }),
      chevronId: 6, // Chuyên viên cao cấp
      departmentId: 6,
      status: 'active',
      roleId: 5, // HR
      vacationDay: 14,
      salary: 14000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 9 Nhân viên nhân sự
  for (let i = 0; i < 9; i++) {
    users.push({
      id: userId++,
      username: `hr_staff${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 28) % 45],
      lastName: lastNames[(i + 10) % 15],
      email: `hr.staff${i + 1}@company.com`,
      startDate: new Date('2022-07-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: i % 4 === 0, children: 0 }),
      chevronId: 8, // Nhân viên
      departmentId: 6,
      status: 'active',
      roleId: 5, // HR
      vacationDay: 12,
      salary: 9500000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // 2 Thực tập sinh
  for (let i = 0; i < 2; i++) {
    users.push({
      id: userId++,
      username: `hr_intern${i + 1}`,
      password: hashedPassword,
      firstName: firstNames[(i + 40) % 45],
      lastName: lastNames[(i + 13) % 15],
      email: `hr.intern${i + 1}@company.com`,
      startDate: new Date('2024-09-01'),
      dayOff: null,
      profileFamily: JSON.stringify({ married: false, children: 0 }),
      chevronId: 10, // Thực tập sinh
      departmentId: 6,
      status: 'active',
      roleId: 5, // HR
      vacationDay: 12,
      salary: 4000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Insert tất cả users
  await knex('users').insert(users);
  
  // Reset sequence
  await knex.raw("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
  
  console.log(`✅ Đã tạo ${users.length} nhân viên phân bố đều qua 6 phòng ban`);
  console.log(`   - Ban Giám đốc: 5 người`);
  console.log(`   - Phòng Công nghệ: 25 người`);
  console.log(`   - Phòng Kinh doanh: 25 người`);
  console.log(`   - Phòng Marketing: 15 người`);
  console.log(`   - Phòng Tài chính: 15 người`);
  console.log(`   - Phòng Nhân sự: 15 người`);
}
