/**
 * Seed file: 50 Employees with Realistic Positions
 * Tạo 50 nhân viên với chức vụ thực tế trong doanh nghiệp
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

  // Danh sách họ và tên đệm Việt Nam
  const lastNames = [
    'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
    'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trương', 'Tô', 'Mai'
  ];
  
  const firstNames = [
    'Văn Anh', 'Thị Bình', 'Minh Chi', 'Văn Dũng', 'Hữu Đức', 'Thanh Giang', 
    'Thu Hà', 'Đức Hải', 'Quang Hiếu', 'Thị Hoa', 'Văn Hùng', 'Thị Hương', 
    'Minh Khoa', 'Thu Linh', 'Văn Long', 'Thị Mai', 'Quang Minh', 'Văn Nam', 
    'Thị Nga', 'Thu Nhung', 'Văn Phong', 'Thị Phương', 'Đức Quân', 'Thị Quyên', 
    'Văn Sơn', 'Thu Thảo', 'Quang Thắng', 'Thị Thủy', 'Thu Trang', 'Văn Tú',
    'Quang Tuấn', 'Văn Tùng', 'Thị Uyên', 'Minh Văn', 'Thị Vân', 'Quang Vinh', 
    'Thị Xuân', 'Thu Yến', 'Hồng Anh', 'Đức Bình'
  ];

  const users = [];
  
  /**
   * Cấu trúc tổ chức thực tế:
   * - Ban Giám đốc (dept 1): CEO, CFO, CTO
   * - Phòng Công nghệ (dept 2): CTO, Director, Managers, Team Leaders, Staff
   * - Phòng Kinh doanh (dept 3): Managers, Team Leaders, Staff
   * - Phòng Marketing (dept 4): CMO, Manager, Staff
   * - Phòng Tài chính-Kế toán (dept 5): CFO, Manager, Staff (Accountant role)
   * - Phòng Nhân sự (dept 6): CHRO, Manager, Staff (HR role)
   * - Phòng Hành chính (dept 7): Manager, Staff
   * - Phòng Vận hành (dept 8): COO, Manager, Staff
   * 
   * Chevron IDs (from updated seed):
   * 1=CEO, 2=COO, 3=CFO, 4=CTO, 5=CMO, 6=CHRO,
   * 7=Director, 8=Head of Dept, 9=Manager,
   * 10=Team Leader, 11=Supervisor, 12=Specialist, 13=Senior Staff,
   * 14=Staff, 15=Junior Staff, 16=Intern
   */
  
  const structure = [
    // Ban Giám đốc (dept 1) - 3 người
    { deptId: 1, deptName: 'BGD', chevronId: 1, count: 1, role: 1 },  // CEO
    { deptId: 1, deptName: 'BGD', chevronId: 3, count: 1, role: 1 },  // CFO
    { deptId: 1, deptName: 'BGD', chevronId: 4, count: 1, role: 1 },  // CTO
    
    // Phòng Công nghệ (dept 2) - 12 người
    { deptId: 2, deptName: 'Tech', chevronId: 7, count: 1, role: 3 },   // Director
    { deptId: 2, deptName: 'Tech', chevronId: 9, count: 2, role: 3 },   // 2 Managers
    { deptId: 2, deptName: 'Tech', chevronId: 10, count: 3, role: 3 },  // 3 Team Leaders
    { deptId: 2, deptName: 'Tech', chevronId: 13, count: 2, role: 2 },  // 2 Senior Staff
    { deptId: 2, deptName: 'Tech', chevronId: 14, count: 3, role: 2 },  // 3 Staff
    { deptId: 2, deptName: 'Tech', chevronId: 15, count: 1, role: 2 },  // 1 Junior
    
    // Phòng Kinh doanh (dept 3) - 10 người
    { deptId: 3, deptName: 'Sales', chevronId: 9, count: 1, role: 3 },   // Manager
    { deptId: 3, deptName: 'Sales', chevronId: 10, count: 2, role: 3 },  // 2 Team Leaders
    { deptId: 3, deptName: 'Sales', chevronId: 13, count: 2, role: 2 },  // 2 Senior Staff
    { deptId: 3, deptName: 'Sales', chevronId: 14, count: 4, role: 2 },  // 4 Staff
    { deptId: 3, deptName: 'Sales', chevronId: 16, count: 1, role: 2 },  // 1 Intern
    
    // Phòng Marketing (dept 4) - 6 người
    { deptId: 4, deptName: 'MKT', chevronId: 5, count: 1, role: 3 },   // CMO
    { deptId: 4, deptName: 'MKT', chevronId: 9, count: 1, role: 3 },   // Manager
    { deptId: 4, deptName: 'MKT', chevronId: 13, count: 1, role: 2 },  // Senior Staff
    { deptId: 4, deptName: 'MKT', chevronId: 14, count: 2, role: 2 },  // 2 Staff
    { deptId: 4, deptName: 'MKT', chevronId: 15, count: 1, role: 2 },  // Junior
    
    // Phòng Tài chính-Kế toán (dept 5) - 7 người
    { deptId: 5, deptName: 'Finance', chevronId: 9, count: 1, role: 3 },   // Manager
    { deptId: 5, deptName: 'Finance', chevronId: 10, count: 1, role: 4 },  // Team Leader (Accountant)
    { deptId: 5, deptName: 'Finance', chevronId: 13, count: 1, role: 4 },  // Senior (Accountant)
    { deptId: 5, deptName: 'Finance', chevronId: 14, count: 3, role: 4 },  // 3 Staff (Accountant)
    { deptId: 5, deptName: 'Finance', chevronId: 15, count: 1, role: 4 },  // Junior (Accountant)
    
    // Phòng Nhân sự (dept 6) - 5 người
    { deptId: 6, deptName: 'HR', chevronId: 6, count: 1, role: 3 },   // CHRO
    { deptId: 6, deptName: 'HR', chevronId: 9, count: 1, role: 5 },   // Manager (HR)
    { deptId: 6, deptName: 'HR', chevronId: 14, count: 2, role: 5 },  // 2 Staff (HR)
    { deptId: 6, deptName: 'HR', chevronId: 15, count: 1, role: 5 },  // Junior (HR)
    
    // Phòng Hành chính (dept 7) - 4 người
    { deptId: 7, deptName: 'Admin', chevronId: 9, count: 1, role: 3 },   // Manager
    { deptId: 7, deptName: 'Admin', chevronId: 14, count: 2, role: 2 },  // 2 Staff
    { deptId: 7, deptName: 'Admin', chevronId: 15, count: 1, role: 2 },  // Junior
    
    // Phòng Vận hành (dept 8) - 5 người
    { deptId: 8, deptName: 'Ops', chevronId: 2, count: 1, role: 3 },   // COO
    { deptId: 8, deptName: 'Ops', chevronId: 9, count: 1, role: 3 },   // Manager
    { deptId: 8, deptName: 'Ops', chevronId: 13, count: 1, role: 2 },  // Senior
    { deptId: 8, deptName: 'Ops', chevronId: 14, count: 2, role: 2 },  // 2 Staff
  ];

  let userId = 2; // Bắt đầu từ 2 (admin có id=1)
  let nameIndex = 0;

  for (const group of structure) {
    for (let i = 0; i < group.count; i++) {
      const lastName = lastNames[nameIndex % lastNames.length];
      const firstName = firstNames[nameIndex % firstNames.length];
      const fullName = `${lastName} ${firstName}`;
      const username = `${group.deptName}${userId}`.toLowerCase();
      
      // Ngày bắt đầu làm việc ngẫu nhiên trong 3 năm qua
      const startDate = new Date(2022, Math.floor(Math.random() * 36), 1);
      
      users.push({
        id: userId,
        username: username,
        password: '$2a$12$ihZ5rvWqsxsdBNTeLmjz3uxdtt5Qs3eLbgNE4kRDiCILxVhT4D6vK', // 123456@
        fullName: fullName,
        email: `${username}@company.com`,
        startDate: startDate.toISOString().split('T')[0],
        phone: genPhone(userId),
        birthday: randomDateBetween(new Date('1975-01-01'), new Date('1999-12-31')),
        gender: (userId % 2) === 0 ? 1 : 2, // alternate 1 (Nam) and 2 (Nữ)
        dayOff: null,
        profileFamily: exampleFamily,
        chevronId: group.chevronId,
        departmentId: group.deptId,
        status: '1',
        roleId: group.role,
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
  
  console.log(`✅ Đã tạo ${users.length} nhân viên mới với chức vụ thực tế (CEO, CFO, CTO, Manager, Staff, v.v.)`);
}
