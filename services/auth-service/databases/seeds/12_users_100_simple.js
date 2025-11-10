/**
 * Seed file: 100 Users (Người dùng)
 * Tạo 100 nhân viên phân bố đều qua 6 phòng ban
 */

import bcrypt from 'bcryptjs';

export async function seed(knex) {
  // Xóa dữ liệu cũ (giữ lại admin với id=1)
  await knex('users').whereNot('id', 1).del();

  const hashedPassword = await bcrypt.hash('123456', 10);
  
  // Danh sách họ tên Việt Nam đầy đủ
  const fullNames = [
    // Ban Giám đốc (5)
    'Nguyễn Văn Minh', 'Trần Thị Hương', 'Lê Văn Tuấn', 'Phạm Đức Hải', 'Hoàng Thị Lan',
    
    // Phòng Công nghệ (25)
    'Vũ Minh Quân', 'Phan Thị Thảo', 'Đặng Văn Long', 'Bùi Thị Mai', 'Đỗ Văn Nam',
    'Hồ Thị Nga', 'Ngô Văn Khoa', 'Dương Thị Linh', 'Lý Văn Dũng', 'Võ Thị Hoa',
    'Nguyễn Văn Hùng', 'Trần Thị Nhung', 'Lê Văn Phong', 'Phạm Thị Phúc', 'Hoàng Văn Sang',
    'Phan Văn Sơn', 'Vũ Thị Tâm', 'Đặng Văn Thanh', 'Bùi Thị Thủy', 'Đỗ Văn Tiến',
    'Hồ Văn Trung', 'Ngô Thị Tú', 'Dương Văn Tuấn', 'Lý Văn Tùng', 'Võ Thị Uyên',
    
    // Phòng Kinh doanh (25)
    'Nguyễn Thị Xuân', 'Trần Văn Vinh', 'Lê Thị Vũ', 'Phạm Văn Yến', 'Hoàng Thị Ý',
    'Phan Văn An', 'Vũ Thị Bình', 'Đặng Văn Chi', 'Bùi Thị Giang', 'Đỗ Văn Hiếu',
    'Hồ Thị Khánh', 'Ngô Văn Minh', 'Dương Thị Ngọc', 'Lý Văn Quân', 'Võ Thị Quyên',
    'Nguyễn Văn Đức', 'Trần Thị Hà', 'Lê Văn Hải', 'Phạm Thị Hương', 'Hoàng Văn Khoa',
    'Phan Thị Lan', 'Vũ Văn Long', 'Đặng Thị Mai', 'Bùi Văn Nam', 'Đỗ Thị Nga',
    
    // Phòng Marketing (15)
    'Hồ Văn Nhung', 'Ngô Thị Phong', 'Dương Văn Phúc', 'Lý Thị Sang', 'Võ Văn Sơn',
    'Nguyễn Thị Tâm', 'Trần Văn Thanh', 'Lê Thị Thảo', 'Phạm Văn Thủy', 'Hoàng Thị Tiến',
    'Phan Văn Trung', 'Vũ Thị Tú', 'Đặng Văn Tuấn', 'Bùi Thị Tùng', 'Đỗ Văn Uyên',
    
    // Phòng Tài chính (15)
    'Hồ Thị Xuân', 'Ngô Văn Vinh', 'Dương Thị Vũ', 'Lý Văn Yến', 'Võ Thị Ý',
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Văn Chi', 'Phạm Thị Giang', 'Hoàng Văn Hiếu',
    'Phan Thị Khánh', 'Vũ Văn Minh', 'Đặng Thị Ngọc', 'Bùi Văn Quân', 'Đỗ Thị Quyên',
    
    // Phòng Nhân sự (15)
    'Hồ Văn Đức', 'Ngô Thị Hà', 'Dương Văn Hải', 'Lý Thị Hương', 'Võ Văn Khoa',
    'Nguyễn Thị Lan', 'Trần Văn Long', 'Lê Thị Mai', 'Phạm Văn Nam', 'Hoàng Thị Nga',
    'Phan Văn Nhung', 'Vũ Thị Phong', 'Đặng Văn Phúc', 'Bùi Thị Sang', 'Đỗ Văn Sơn'
  ];

  const users = [];
  let userId = 2;
  let nameIdx = 0;

  // Hàm tạo user
  const createUser = (config) => {
    const fullName = fullNames[nameIdx++] || `Nhân viên ${nameIdx}`;
    const username = config.prefix + (config.index || userId);
    return {
      id: userId++,
      username: username,
      password: hashedPassword,
      fullName: fullName,
      email: `${username}@company.com`,
      startDate: config.startDate || new Date('2022-01-01'),
      dayOff: null,
      profileFamily: JSON.stringify(config.family || { married: false, children: 0 }),
      chevronId: config.chevronId,
      departmentId: config.departmentId,
      status: 1,
      roleId: config.roleId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  // BAN GIÁM ĐỐC (5 người): dept=1
  users.push(createUser({ prefix: 'ceo', chevronId: 1, departmentId: 1, roleId: 3, startDate: new Date('2020-01-15'), family: { married: true, children: 2 } }));
  for (let i = 1; i <= 4; i++) {
    users.push(createUser({ prefix: 'director', index: i, chevronId: 2, departmentId: 1, roleId: 3, startDate: new Date('2020-06-01'), family: { married: i % 2 === 0, children: i % 3 } }));
  }

  // PHÒNG CÔNG NGHỆ (25 người): dept=2
  users.push(createUser({ prefix: 'tech_mgr', chevronId: 3, departmentId: 2, roleId: 3, startDate: new Date('2021-01-10') }));
  users.push(createUser({ prefix: 'tech_dep', chevronId: 4, departmentId: 2, roleId: 3, startDate: new Date('2021-03-15') }));
  for (let i = 1; i <= 3; i++) {
    users.push(createUser({ prefix: 'tech_tl', index: i, chevronId: 5, departmentId: 2, roleId: 3, startDate: new Date('2021-06-01') }));
  }
  for (let i = 1; i <= 5; i++) {
    users.push(createUser({ prefix: 'tech_sr', index: i, chevronId: 6, departmentId: 2, roleId: 2, startDate: new Date('2022-01-10') }));
  }
  for (let i = 1; i <= 8; i++) {
    users.push(createUser({ prefix: 'tech_dev', index: i, chevronId: 7, departmentId: 2, roleId: 2, startDate: new Date('2022-06-01') }));
  }
  for (let i = 1; i <= 5; i++) {
    users.push(createUser({ prefix: 'tech_staff', index: i, chevronId: 8, departmentId: 2, roleId: 2, startDate: new Date('2023-03-01') }));
  }
  for (let i = 1; i <= 2; i++) {
    users.push(createUser({ prefix: 'tech_int', index: i, chevronId: 10, departmentId: 2, roleId: 2, startDate: new Date('2024-09-01') }));
  }

  // PHÒNG KINH DOANH (25 người): dept=3
  users.push(createUser({ prefix: 'sales_mgr', chevronId: 3, departmentId: 3, roleId: 3, startDate: new Date('2021-02-01') }));
  users.push(createUser({ prefix: 'sales_dep', chevronId: 4, departmentId: 3, roleId: 3, startDate: new Date('2021-04-01') }));
  for (let i = 1; i <= 3; i++) {
    users.push(createUser({ prefix: 'sales_tl', index: i, chevronId: 5, departmentId: 3, roleId: 3, startDate: new Date('2021-08-01') }));
  }
  for (let i = 1; i <= 15; i++) {
    users.push(createUser({ prefix: 'sales', index: i, chevronId: 8, departmentId: 3, roleId: 2, startDate: new Date('2022-03-01') }));
  }
  for (let i = 1; i <= 5; i++) {
    users.push(createUser({ prefix: 'sales_int', index: i, chevronId: 10, departmentId: 3, roleId: 2, startDate: new Date('2024-09-01') }));
  }

  // PHÒNG MARKETING (15 người): dept=4
  users.push(createUser({ prefix: 'mkt_mgr', chevronId: 3, departmentId: 4, roleId: 3, startDate: new Date('2021-03-01') }));
  users.push(createUser({ prefix: 'mkt_dep', chevronId: 4, departmentId: 4, roleId: 3, startDate: new Date('2021-05-15') }));
  for (let i = 1; i <= 2; i++) {
    users.push(createUser({ prefix: 'mkt_tl', index: i, chevronId: 5, departmentId: 4, roleId: 3, startDate: new Date('2021-09-01') }));
  }
  for (let i = 1; i <= 8; i++) {
    users.push(createUser({ prefix: 'mkt_staff', index: i, chevronId: 7, departmentId: 4, roleId: 2, startDate: new Date('2022-06-01') }));
  }
  for (let i = 1; i <= 3; i++) {
    users.push(createUser({ prefix: 'mkt_int', index: i, chevronId: 10, departmentId: 4, roleId: 2, startDate: new Date('2024-09-01') }));
  }

  // PHÒNG TÀI CHÍNH (15 người): dept=5
  users.push(createUser({ prefix: 'fin_mgr', chevronId: 3, departmentId: 5, roleId: 4, startDate: new Date('2020-08-01') }));
  users.push(createUser({ prefix: 'fin_dep', chevronId: 4, departmentId: 5, roleId: 4, startDate: new Date('2021-01-15') }));
  for (let i = 1; i <= 3; i++) {
    users.push(createUser({ prefix: 'fin_sr', index: i, chevronId: 6, departmentId: 5, roleId: 4, startDate: new Date('2021-07-01') }));
  }
  for (let i = 1; i <= 8; i++) {
    users.push(createUser({ prefix: 'fin_staff', index: i, chevronId: 8, departmentId: 5, roleId: 4, startDate: new Date('2022-05-01') }));
  }
  for (let i = 1; i <= 2; i++) {
    users.push(createUser({ prefix: 'fin_int', index: i, chevronId: 10, departmentId: 5, roleId: 4, startDate: new Date('2024-09-01') }));
  }

  // PHÒNG NHÂN SỰ (15 người): dept=6
  users.push(createUser({ prefix: 'hr_mgr', chevronId: 3, departmentId: 6, roleId: 5, startDate: new Date('2020-09-01') }));
  users.push(createUser({ prefix: 'hr_dep', chevronId: 4, departmentId: 6, roleId: 5, startDate: new Date('2021-02-01') }));
  for (let i = 1; i <= 2; i++) {
    users.push(createUser({ prefix: 'hr_sr', index: i, chevronId: 6, departmentId: 6, roleId: 5, startDate: new Date('2021-08-01') }));
  }
  for (let i = 1; i <= 9; i++) {
    users.push(createUser({ prefix: 'hr_staff', index: i, chevronId: 8, departmentId: 6, roleId: 5, startDate: new Date('2022-07-01') }));
  }
  for (let i = 1; i <= 2; i++) {
    users.push(createUser({ prefix: 'hr_int', index: i, chevronId: 10, departmentId: 6, roleId: 5, startDate: new Date('2024-09-01') }));
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
