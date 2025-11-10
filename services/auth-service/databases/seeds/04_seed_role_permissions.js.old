export async function seed(knex) {
  // Permission flags (see src/utils/decode-permisison.ts):
  // create = 8, read = 4, update = 2, delete = 1, approve = 16
  // ALL = 31 (8+4+2+1+16)
  // Roles: 1=Admin, 2=Employee, 3=Leader, 4=Accountant, 5=HR
  
  // Xóa tất cả dữ liệu cũ trước
  await knex("role_permissions").del();
  
  const data = [
    // Admin (roleId:1) - global full access across modules
    { roleId: 1, permissionId: 1, value: 31, scope: 1 },  // root
    { roleId: 1, permissionId: 2, value: 31, scope: 1 },  // users
    { roleId: 1, permissionId: 3, value: 31, scope: 1 },  // roles
    { roleId: 1, permissionId: 4, value: 31, scope: 1 },  // decentralization
    { roleId: 1, permissionId: 5, value: 31, scope: 1 },  // applications
    { roleId: 1, permissionId: 6, value: 31, scope: 1 },  // settings
    { roleId: 1, permissionId: 7, value: 31, scope: 1 },  // contractTypes
    { roleId: 1, permissionId: 8, value: 31, scope: 1 },  // chevrons
    { roleId: 1, permissionId: 9, value: 31, scope: 1 },  // departments
    { roleId: 1, permissionId: 10, value: 31, scope: 1 }, // dashboard
    { roleId: 1, permissionId: 11, value: 31, scope: 1 }, // timeAttendance
    { roleId: 1, permissionId: 12, value: 31, scope: 1 }, // salary_allowances
    { roleId: 1, permissionId: 13, value: 31, scope: 1 }, // salaries
    { roleId: 1, permissionId: 14, value: 31, scope: 1 }, // personal_salary_info
    { roleId: 1, permissionId: 15, value: 31, scope: 1 }, // CV
    { roleId: 1, permissionId: 16, value: 31, scope: 1 }, // projects

    // ==================== NHÂN VIÊN (roleId: 2) - Limited access (personal) ====================
    { roleId: 2, permissionId: 5, value: 12, scope: 3 },  // applications: create(8)+read(4) own
    { roleId: 2, permissionId: 10, value: 4, scope: 3 },  // dashboard
    { roleId: 2, permissionId: 11, value: 4, scope: 3 },  // timeAttendance
    { roleId: 2, permissionId: 14, value: 4, scope: 3 },  // personal_salary_info
    { roleId: 2, permissionId: 16, value: 4, scope: 3 },  // projects

    // ==================== TRƯỞNG PHÒNG (roleId: 3) - Department management ====================
    { roleId: 3, permissionId: 2, value: 4, scope: 2 },   // users: read in department
    { roleId: 3, permissionId: 5, value: 31, scope: 2 },  // applications: full access in dept
    { roleId: 3, permissionId: 10, value: 4, scope: 2 },  // dashboard
    { roleId: 3, permissionId: 11, value: 20, scope: 2 }, // timeAttendance: read(4)+approve(16)
    { roleId: 3, permissionId: 14, value: 4, scope: 3 },  // personal_salary_info
    { roleId: 3, permissionId: 15, value: 4, scope: 2 },  // CV
    { roleId: 3, permissionId: 16, value: 31, scope: 2 }, // projects

    // ==================== KẾ TOÁN (roleId: 4) - Financial management ====================
    { roleId: 4, permissionId: 2, value: 4, scope: 1 },   // users
    { roleId: 4, permissionId: 5, value: 6, scope: 1 },   // applications: read(4)+update(2)
    { roleId: 4, permissionId: 10, value: 4, scope: 1 },  // dashboard
    { roleId: 4, permissionId: 11, value: 20, scope: 1 }, // timeAttendance: read+approve
    { roleId: 4, permissionId: 12, value: 31, scope: 1 }, // salary_allowances
    { roleId: 4, permissionId: 13, value: 31, scope: 1 }, // salaries
    { roleId: 4, permissionId: 14, value: 4, scope: 3 },  // personal_salary_info
    { roleId: 4, permissionId: 16, value: 4, scope: 1 },  // projects

    // ==================== NHÂN SỰ (roleId: 5) - HR management ====================
    { roleId: 5, permissionId: 2, value: 31, scope: 1 },  // users
    { roleId: 5, permissionId: 3, value: 4, scope: 1 },   // roles
    { roleId: 5, permissionId: 5, value: 31, scope: 1 },  // applications
    { roleId: 5, permissionId: 7, value: 31, scope: 1 },  // contractTypes
    { roleId: 5, permissionId: 8, value: 31, scope: 1 },  // chevrons
    { roleId: 5, permissionId: 9, value: 31, scope: 1 },  // departments
    { roleId: 5, permissionId: 10, value: 4, scope: 1 },  // dashboard
    { roleId: 5, permissionId: 11, value: 31, scope: 1 }, // timeAttendance
    { roleId: 5, permissionId: 12, value: 4, scope: 1 },  // salary_allowances
    { roleId: 5, permissionId: 14, value: 4, scope: 3 },  // personal_salary_info
    { roleId: 5, permissionId: 15, value: 31, scope: 1 }, // CV
    { roleId: 5, permissionId: 16, value: 31, scope: 1 }, // projects
  ];

  // Inserts seed entries
  await knex("role_permissions").insert(data);
  
  // Reset sequence
  await knex.raw(
    "SELECT setval('role_permissions_id_seq', (SELECT MAX(id) FROM role_permissions))"
  );
}
