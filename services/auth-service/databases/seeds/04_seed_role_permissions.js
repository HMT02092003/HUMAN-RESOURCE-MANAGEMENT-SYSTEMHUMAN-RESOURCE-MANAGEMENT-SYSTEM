/**
 * Seed Role Permissions - Based on decode-permisison.ts
 * 
 * Permission Values (Bitwise):
 * - create: 8
 * - read: 4
 * - update: 2
 * - delete: 1
 * - approve: 16
 * - ALL: 31 (8+4+2+1+16)
 * 
 * Scope Values:
 * - 1: global (toàn công ty)
 * - 2: department (phòng ban)
 * - 3: personal (cá nhân)
 * 
 * Roles:
 * - 1: Admin (Quản trị viên)
 * - 2: Employee (Nhân viên)
 * - 3: Leader (Trưởng phòng)
 * - 4: Accountant (Kế toán)
 * - 5: HR (Nhân sự)
 */

export async function seed(knex) {
  // Xóa tất cả dữ liệu cũ
  await knex("role_permissions").del();
  
  const data = [
    // ==================== ADMIN (roleId: 1) - FULL ACCESS EVERYTHING ====================
    { roleId: 1, permissionId: 1, value: 31, key: 'root', scope: 1 },   // root - Full global
    { roleId: 1, permissionId: 2, value: 31, key: 'users', scope: 1 },   // users - Full global
    { roleId: 1, permissionId: 3, value: 31, key: 'roles', scope: 1 },   // roles - Full global
    { roleId: 1, permissionId: 4, value: 31, key: 'decentralization', scope: 1 },   // decentralization - Full global
    { roleId: 1, permissionId: 5, value: 31, key: 'applications', scope: 1 },   // applications - Full global
    { roleId: 1, permissionId: 6, value: 31, key: 'settings', scope: 1 },   // settings - Full global
    { roleId: 1, permissionId: 7, value: 31, key: 'contractTypes', scope: 1 },   // contractTypes - Full global
    { roleId: 1, permissionId: 8, value: 31, key: 'chevrons', scope: 1 },   // chevrons - Full global
    { roleId: 1, permissionId: 9, value: 31, key: 'departments', scope: 1 },   // departments - Full global
    { roleId: 1, permissionId: 10, value: 31, key: 'dashboard', scope: 1 },  // dashboard - Full global
    { roleId: 1, permissionId: 11, value: 31, key: 'timeAttendance', scope: 1 },  // timeAttendance - Full global
    { roleId: 1, permissionId: 12, value: 31, key: 'salary_allowances', scope: 1 },  // salary_allowances - Full global
    { roleId: 1, permissionId: 13, value: 31, key: 'salaries', scope: 1 },  // salaries - Full global
    { roleId: 1, permissionId: 14, value: 31, key: 'personal_salary_info', scope: 1 },  // personal_salary_info - Full global
    { roleId: 1, permissionId: 15, value: 31, key: 'CV', scope: 1 },  // CV - Full global
    { roleId: 1, permissionId: 16, value: 31, key: 'projects', scope: 1 },  // projects - Full global

    // ==================== NHÂN VIÊN (roleId: 2) - PERSONAL ACCESS ====================
    { roleId: 2, permissionId: 2, value: 4, key: 'users', scope: 3 },    // users - read personal (xem thông tin mình)
    { roleId: 2, permissionId: 5, value: 12, key: 'applications', scope: 3 },   // applications - create(8) + read(4) = 12 (tạo và xem đơn của mình)
    { roleId: 2, permissionId: 10, value: 4, key: 'dashboard', scope: 3 },   // dashboard - read personal
    { roleId: 2, permissionId: 11, value: 4, key: 'timeAttendance', scope: 3 },   // timeAttendance - read personal (xem chấm công mình)
    { roleId: 2, permissionId: 14, value: 4, key: 'personal_salary_info', scope: 3 },   // personal_salary_info - read personal (xem lương mình)
    { roleId: 2, permissionId: 15, value: 4, key: 'CV', scope: 3 },   // CV - read personal (xem CV mình)
    { roleId: 2, permissionId: 16, value: 4, key: 'projects', scope: 3 },   // projects - read personal (xem project của mình)

    // ==================== TRƯỞNG PHÒNG (roleId: 3) - DEPARTMENT MANAGEMENT ====================
    { roleId: 3, permissionId: 2, value: 4, key: 'users', scope: 2 },    // users - read department (xem nhân viên trong phòng)
    { roleId: 3, permissionId: 5, value: 31, key: 'applications', scope: 2 },   // applications - full department (quản lý đơn từ trong phòng)
    { roleId: 3, permissionId: 10, value: 4, key: 'dashboard', scope: 2 },   // dashboard - read department
    { roleId: 3, permissionId: 11, value: 20, key: 'timeAttendance', scope: 2 },  // timeAttendance - read(4) + approve(16) = 20 (duyệt chấm công phòng)
    { roleId: 3, permissionId: 14, value: 4, key: 'personal_salary_info', scope: 3 },   // personal_salary_info - read personal (chỉ xem lương mình)
    { roleId: 3, permissionId: 15, value: 4, key: 'CV', scope: 2 },   // CV - read department (xem CV trong phòng)
    { roleId: 3, permissionId: 16, value: 31, key: 'projects', scope: 2 },  // projects - full department (quản lý dự án phòng)

    // ==================== KẾ TOÁN (roleId: 4) - FINANCIAL MANAGEMENT ====================
    { roleId: 4, permissionId: 2, value: 4, key: 'users', scope: 1 },    // users - read global (xem tất cả nhân viên để tính lương)
    { roleId: 4, permissionId: 5, value: 20, key: 'applications', scope: 1 },   // applications - read(4) + approve(16) = 20 (duyệt đơn)
    { roleId: 4, permissionId: 10, value: 4, key: 'dashboard', scope: 1 },   // dashboard - read global
    { roleId: 4, permissionId: 11, value: 20, key: 'timeAttendance', scope: 1 },  // timeAttendance - read(4) + approve(16) = 20 (duyệt chấm công)
    { roleId: 4, permissionId: 12, value: 31, key: 'salary_allowances', scope: 1 },  // salary_allowances - full global (quản lý phụ cấp)
    { roleId: 4, permissionId: 13, value: 31, key: 'salaries', scope: 1 },  // salaries - full global (quản lý lương)
    { roleId: 4, permissionId: 14, value: 4, key: 'personal_salary_info', scope: 3 },   // personal_salary_info - read personal (xem lương mình)
    { roleId: 4, permissionId: 15, value: 4, key: 'CV', scope: 1 },   // CV - read global (xem CV để verify)
    { roleId: 4, permissionId: 16, value: 4, key: 'projects', scope: 1 },   // projects - read global (xem project)

    // ==================== NHÂN SỰ (roleId: 5) - HR MANAGEMENT ====================
    { roleId: 5, permissionId: 2, value: 31, key: 'users', scope: 1 },   // users - full global (quản lý nhân viên)
    { roleId: 5, permissionId: 3, value: 4, key: 'roles', scope: 1 },    // roles - read global (xem roles)
    { roleId: 5, permissionId: 4, value: 6, key: 'decentralization', scope: 1 },    // decentralization - read(4) + update(2) = 6 (phân quyền)
    { roleId: 5, permissionId: 5, value: 31, key: 'applications', scope: 1 },   // applications - full global (quản lý đơn từ)
    { roleId: 5, permissionId: 6, value: 14, key: 'settings', scope: 1 },   // settings - create(8) + read(4) + update(2) = 14
    { roleId: 5, permissionId: 7, value: 31, key: 'contractTypes', scope: 1 },   // contractTypes - full global (quản lý loại hợp đồng)
    { roleId: 5, permissionId: 8, value: 31, key: 'chevrons', scope: 1 },   // chevrons - full global (quản lý chức vụ)
    { roleId: 5, permissionId: 9, value: 31, key: 'departments', scope: 1 },   // departments - full global (quản lý phòng ban)
    { roleId: 5, permissionId: 10, value: 4, key: 'dashboard', scope: 1 },   // dashboard - read global
    { roleId: 5, permissionId: 11, value: 31, key: 'timeAttendance', scope: 1 },  // timeAttendance - full global (quản lý chấm công)
    { roleId: 5, permissionId: 12, value: 4, key: 'salary_allowances', scope: 1 },   // salary_allowances - read global (xem phụ cấp)
    { roleId: 5, permissionId: 13, value: 4, key: 'salaries', scope: 1 },   // salaries - read global (xem lương)
    { roleId: 5, permissionId: 14, value: 4, key: 'personal_salary_info', scope: 3 },   // personal_salary_info - read personal (xem lương mình)
    { roleId: 5, permissionId: 15, value: 31, key: 'CV', scope: 1 },  // CV - full global (quản lý hồ sơ)
    { roleId: 5, permissionId: 16, value: 31, key: 'projects', scope: 1 },  // projects - full global (quản lý dự án)
  ];

  // Insert seed entries
  await knex("role_permissions").insert(data);
  
  // Reset sequence
  await knex.raw(
    "SELECT setval('role_permissions_id_seq', (SELECT MAX(id) FROM role_permissions))"
  );

  console.log('✅ Đã seed role permissions với phân quyền chính xác');
  console.log('   - Admin: Full access tất cả modules (scope: global)');
  console.log('   - Employee: Personal access only');
  console.log('   - Leader: Department management');
  console.log('   - Accountant: Financial management');
  console.log('   - HR: People & operations management');
}
