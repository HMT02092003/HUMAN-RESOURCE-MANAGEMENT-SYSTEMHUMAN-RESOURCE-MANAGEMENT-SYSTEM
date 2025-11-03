/**
 * Seed file: 50 Employees (Nhân viên)
 * Tạo 50 nhân viên phân bổ đều cho các phòng ban và chức vụ
 */

export async function seed(knex) {
  // Giữ lại admin hiện tại, chỉ thêm nhân viên mới
  await knex('users').where('id', '>', 1).del();

  // Helpers
  const randomDateBetween = (start, end) => {
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return d.toISOString().split('T')[0];
  };

  const genPhone = (i) => {
    const prefixes = ['090','091','092','093','094','095','096','097','098','099'];
    const prefix = prefixes[i % prefixes.length];
    const tail = String(1000000 + i).slice(1);
    return `${prefix}${tail}`;
  };

  const exampleFamily = JSON.stringify([
    { name: 'Thang', birthday: '2025-10-30T17:00:00.000Z', relationship: 1 },
    { name: 'Nhung', birthday: '2025-10-28T17:00:00.000Z', relationship: 4 }
  ]);

  // Danh sách tên Việt Nam
  const firstNames = [
    'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
    'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trương', 'Tô', 'Mai'
  ];
  
  const lastNames = [
    'Anh', 'Bình', 'Chi', 'Dũng', 'Đức', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hoa',
    'Hùng', 'Hương', 'Khoa', 'Linh', 'Long', 'Mai', 'Minh', 'Nam', 'Nga', 'Nhung',
    'Phong', 'Phương', 'Quân', 'Quyên', 'Sơn', 'Thảo', 'Thắng', 'Thủy', 'Trang', 'Tú',
    'Tuấn', 'Tùng', 'Uyên', 'Văn', 'Vân', 'Vinh', 'Xuân', 'Yến'
  ];

  const users = [];
  
  // Cấu trúc phòng ban với số lượng từng chức vụ (tổng 49 nhân viên mới, cộng admin = 50)
  // 6 phòng ban: KT, KD, NS, KeToan, Marketing, HanhChinh
  // 5 chức vụ: NhanVien(1), TruongNhom(2), PhoPHong(3), TruongPhong(4), GiamDoc(5)
  
  const structure = [
    // Phòng Kỹ thuật (id=1) - 10 người
    { deptId: 1, deptName: 'KT', chevronId: 1, count: 6 },  // 6 Nhân viên
    { deptId: 1, deptName: 'KT', chevronId: 2, count: 2 },  // 2 Trưởng nhóm
    { deptId: 1, deptName: 'KT', chevronId: 3, count: 1 },  // 1 Phó phòng
    { deptId: 1, deptName: 'KT', chevronId: 4, count: 1 },  // 1 Trưởng phòng
    
    // Phòng Kinh doanh (id=2) - 9 người
    { deptId: 2, deptName: 'KD', chevronId: 1, count: 6 },  // 6 Nhân viên
    { deptId: 2, deptName: 'KD', chevronId: 2, count: 1 },  // 1 Trưởng nhóm
    { deptId: 2, deptName: 'KD', chevronId: 3, count: 1 },  // 1 Phó phòng
    { deptId: 2, deptName: 'KD', chevronId: 4, count: 1 },  // 1 Trưởng phòng
    
    // Phòng Nhân sự (id=3) - 6 người
    { deptId: 3, deptName: 'NS', chevronId: 1, count: 3 },  // 3 Nhân viên
    { deptId: 3, deptName: 'NS', chevronId: 2, count: 1 },  // 1 Trưởng nhóm
    { deptId: 3, deptName: 'NS', chevronId: 3, count: 1 },  // 1 Phó phòng
    { deptId: 3, deptName: 'NS', chevronId: 4, count: 1 },  // 1 Trưởng phòng
    
    // Phòng Kế toán (id=4) - 8 người
    { deptId: 4, deptName: 'Acc', chevronId: 1, count: 5 }, // 5 Nhân viên
    { deptId: 4, deptName: 'Acc', chevronId: 2, count: 1 }, // 1 Trưởng nhóm
    { deptId: 4, deptName: 'Acc', chevronId: 3, count: 1 }, // 1 Phó phòng
    { deptId: 4, deptName: 'Acc', chevronId: 4, count: 1 }, // 1 Trưởng phòng
    
    // Phòng Marketing (id=5) - 8 người
    { deptId: 5, deptName: 'MKT', chevronId: 1, count: 5 }, // 5 Nhân viên
    { deptId: 5, deptName: 'MKT', chevronId: 2, count: 1 }, // 1 Trưởng nhóm
    { deptId: 5, deptName: 'MKT', chevronId: 3, count: 1 }, // 1 Phó phòng
    { deptId: 5, deptName: 'MKT', chevronId: 4, count: 1 }, // 1 Trưởng phòng
    
    // Phòng Hành chính (id=6) - 7 người
    { deptId: 6, deptName: 'HC', chevronId: 1, count: 4 },  // 4 Nhân viên
    { deptId: 6, deptName: 'HC', chevronId: 2, count: 1 },  // 1 Trưởng nhóm
    { deptId: 6, deptName: 'HC', chevronId: 3, count: 1 },  // 1 Phó phòng
    { deptId: 6, deptName: 'HC', chevronId: 4, count: 1 },  // 1 Trưởng phòng
    
    // Ban Giám đốc - 1 người
    { deptId: 6, deptName: 'BGD', chevronId: 5, count: 1 }, // 1 Giám đốc
  ];

  // Ánh xạ chức vụ -> role
  const chevronToRole = {
    1: 2, // Nhân viên -> role employee
    2: 3, // Trưởng nhóm -> role leader
    3: 3, // Phó phòng -> role leader
    4: 3, // Trưởng phòng -> role leader
    5: 1, // Giám đốc -> role admin
  };
  
  // Vai trò đặc biệt cho phòng Nhân sự và Kế toán
  const specialRoles = {
    3: 5, // Phòng Nhân sự -> role hr
    4: 4, // Phòng Kế toán -> role accountant
  };

  let userId = 2; // Bắt đầu từ 2 (admin có id=1)
  let nameIndex = 0;

  for (const group of structure) {
    for (let i = 0; i < group.count; i++) {
      const firstName = firstNames[nameIndex % firstNames.length];
      const lastName = lastNames[Math.floor(nameIndex / firstNames.length) % lastNames.length];
      const username = `${group.deptName}${userId}`.toLowerCase();
      
      // Xác định roleId: ưu tiên phòng ban đặc biệt, sau đó theo chức vụ
      let roleId = chevronToRole[group.chevronId];
      if (specialRoles[group.deptId] && group.chevronId === 1) {
        roleId = specialRoles[group.deptId];
      }
      
      // Ngày bắt đầu làm việc ngẫu nhiên trong 2 năm qua
      const startDate = new Date(2023, Math.floor(Math.random() * 24), 1);
      
      users.push({
        id: userId,
        username: username,
        password: '$2a$12$ihZ5rvWqsxsdBNTeLmjz3uxdtt5Qs3eLbgNE4kRDiCILxVhT4D6vK', // 123456@
        firstName: firstName,
        lastName: lastName,
        email: `${username}@company.com`,
        startDate: startDate.toISOString().split('T')[0],
        // Add missing personal info: phone, birthday, gender, profileFamily
        phone: genPhone(userId),
        birthday: randomDateBetween(new Date('1975-01-01'), new Date('1999-12-31')),
        gender: (userId % 2) === 0 ? 1 : 2, // alternate 1 (Nam) and 2 (Nữ)
        dayOff: null,
        profileFamily: exampleFamily,
        chevronId: group.chevronId,
        departmentId: group.deptId,
        status: '1',
        roleId: roleId,
        createdBy: 1,
        updatedBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      userId++;
      nameIndex++;
    }
  }

  // Insert dữ liệu
  await knex('users').insert(users);
  
  // Reset sequence
  await knex.raw("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
  
  console.log(`✅ Đã tạo ${users.length} nhân viên mới (tổng cộng với admin: ${users.length + 1} người)`);
}
