export async function seed(knex) {
  // Permission values: 1=Create, 2=Read, 4=Update, 8=Delete, 16=Export, 31=All
  // Roles: 1=Admin, 2=Employee, 3=Leader, 4=Accountant, 5=HR
  const data = [
    // ==================== ADMIN (roleId: 1) - Full access ====================
    {
      "id": 1,
      "roleId": 1,
      "permissionId": 1,
      "value": 31,
      "key": "root",
      "scope": 1,
    },
    {
      "id": 2,
      "roleId": 1,
      "permissionId": 2,
      "value": 31,
      "key": "users",
      "scope": 1,
    },
    {
      "id": 3,
      "roleId": 1,
      "permissionId": 3,
      "value": 31,
      "key": "roles",
      "scope": 1,
    },
    {
      "id": 4,
      "roleId": 1,
      "permissionId": 4,
      "value": 2,
      "key": "decentralization",
      "scope": 1,
    },
    {
      "id": 5,
      "roleId": 1,
      "permissionId": 5,
      "value": 31,
      "key": "applications",
      "scope": 1,
    },
    {
      "id": 6,
      "roleId": 1,
      "permissionId": 6,
      "value": 31,
      "key": "settings",
      "scope": 1,
    },
    {
      "id": 7,
      "roleId": 1,
      "permissionId": 7,
      "value": 31,
      "key": "contractTypes",
      "scope": 1,
    },
    {
      "id": 8,
      "roleId": 1,
      "permissionId": 8,
      "value": 31,
      "key": "chevrons",
      "scope": 1,
    },
    {
      "id": 9,
      "roleId": 1,
      "permissionId": 9,
      "value": 31,
      "key": "departments",
      "scope": 1,
    },
    {
      "id": 10,
      "roleId": 1,
      "permissionId": 10,
      "value": 31,
      "key": "dashboard",
      "scope": 1,
    },
    {
      "id": 11,
      "roleId": 1,
      "permissionId": 11,
      "value": 31,
      "key": "timeAttendance",
      "scope": 1,
    },
    {
      "id": 12,
      "roleId": 1,
      "permissionId": 12,
      "value": 31,
      "key": "salary_allowances",
      "scope": 1,
    },
    {
      "id": 13,
      "roleId": 1,
      "permissionId": 13,
      "value": 31,
      "key": "salaries",
      "scope": 1,
    },
    {
      "id": 14,
      "roleId": 1,
      "permissionId": 14,
      "value": 31,
      "key": "personal_salary_info",
      "scope": 1,
    },
    {
      "id": 15,
      "roleId": 1,
      "permissionId": 15,
      "value": 31,
      "key": "CV",
      "scope": 1,
    },
    {
      "id": 16,
      "roleId": 1,
      "permissionId": 16,
      "value": 31,
      "key": "jobs",
      "scope": 1,
    },

    // ==================== NHÂN VIÊN (roleId: 2) - Limited access ====================
    {
      "id": 17,
      "roleId": 2,
      "permissionId": 5,
      "value": 3, // Create + Read applications
      "key": "applications",
      "scope": 2, // Own data only
    },
    {
      "id": 18,
      "roleId": 2,
      "permissionId": 10,
      "value": 2, // Read dashboard
      "key": "dashboard",
      "scope": 2,
    },
    {
      "id": 19,
      "roleId": 2,
      "permissionId": 11,
      "value": 2, // Read attendance
      "key": "timeAttendance",
      "scope": 2,
    },
    {
      "id": 20,
      "roleId": 2,
      "permissionId": 14,
      "value": 2, // Read own salary info
      "key": "personal_salary_info",
      "scope": 2,
    },
    {
      "id": 21,
      "roleId": 2,
      "permissionId": 16,
      "value": 2, // Read jobs
      "key": "jobs",
      "scope": 1,
    },

    // ==================== TRƯỞNG PHÒNG (roleId: 3) - Department management ====================
    {
      "id": 22,
      "roleId": 3,
      "permissionId": 2,
      "value": 2, // Read users
      "key": "users",
      "scope": 3, // Department scope
    },
    {
      "id": 23,
      "roleId": 3,
      "permissionId": 5,
      "value": 31, // Full access to applications
      "key": "applications",
      "scope": 3,
    },
    {
      "id": 24,
      "roleId": 3,
      "permissionId": 10,
      "value": 2, // Read dashboard
      "key": "dashboard",
      "scope": 3,
    },
    {
      "id": 25,
      "roleId": 3,
      "permissionId": 11,
      "value": 18, // Read + Export attendance
      "key": "timeAttendance",
      "scope": 3,
    },
    {
      "id": 26,
      "roleId": 3,
      "permissionId": 14,
      "value": 2, // Read own salary
      "key": "personal_salary_info",
      "scope": 2,
    },
    {
      "id": 27,
      "roleId": 3,
      "permissionId": 15,
      "value": 2, // Read CV
      "key": "CV",
      "scope": 3,
    },
    {
      "id": 28,
      "roleId": 3,
      "permissionId": 16,
      "value": 31, // Full access to jobs
      "key": "jobs",
      "scope": 3,
    },

    // ==================== KẾ TOÁN (roleId: 4) - Financial management ====================
    {
      "id": 29,
      "roleId": 4,
      "permissionId": 2,
      "value": 2, // Read users
      "key": "users",
      "scope": 1,
    },
    {
      "id": 30,
      "roleId": 4,
      "permissionId": 5,
      "value": 6, // Read + Update applications
      "key": "applications",
      "scope": 1,
    },
    {
      "id": 31,
      "roleId": 4,
      "permissionId": 10,
      "value": 2, // Read dashboard
      "key": "dashboard",
      "scope": 1,
    },
    {
      "id": 32,
      "roleId": 4,
      "permissionId": 11,
      "value": 18, // Read + Export attendance
      "key": "timeAttendance",
      "scope": 1,
    },
    {
      "id": 33,
      "roleId": 4,
      "permissionId": 12,
      "value": 31, // Full access to allowances
      "key": "salary_allowances",
      "scope": 1,
    },
    {
      "id": 34,
      "roleId": 4,
      "permissionId": 13,
      "value": 31, // Full access to salaries
      "key": "salaries",
      "scope": 1,
    },
    {
      "id": 35,
      "roleId": 4,
      "permissionId": 14,
      "value": 2, // Read own salary
      "key": "personal_salary_info",
      "scope": 2,
    },
    {
      "id": 36,
      "roleId": 4,
      "permissionId": 16,
      "value": 2, // Read jobs
      "key": "jobs",
      "scope": 1,
    },

    // ==================== NHÂN SỰ (roleId: 5) - HR management ====================
    {
      "id": 37,
      "roleId": 5,
      "permissionId": 2,
      "value": 31, // Full access to users
      "key": "users",
      "scope": 1,
    },
    {
      "id": 38,
      "roleId": 5,
      "permissionId": 3,
      "value": 2, // Read roles
      "key": "roles",
      "scope": 1,
    },
    {
      "id": 39,
      "roleId": 5,
      "permissionId": 5,
      "value": 31, // Full access to applications
      "key": "applications",
      "scope": 1,
    },
    {
      "id": 40,
      "roleId": 5,
      "permissionId": 7,
      "value": 31, // Full access to contract types
      "key": "contractTypes",
      "scope": 1,
    },
    {
      "id": 41,
      "roleId": 5,
      "permissionId": 8,
      "value": 31, // Full access to chevrons
      "key": "chevrons",
      "scope": 1,
    },
    {
      "id": 42,
      "roleId": 5,
      "permissionId": 9,
      "value": 31, // Full access to departments
      "key": "departments",
      "scope": 1,
    },
    {
      "id": 43,
      "roleId": 5,
      "permissionId": 10,
      "value": 2, // Read dashboard
      "key": "dashboard",
      "scope": 1,
    },
    {
      "id": 44,
      "roleId": 5,
      "permissionId": 11,
      "value": 31, // Full access to attendance
      "key": "timeAttendance",
      "scope": 1,
    },
    {
      "id": 45,
      "roleId": 5,
      "permissionId": 12,
      "value": 2, // Read allowances
      "key": "salary_allowances",
      "scope": 1,
    },
    {
      "id": 46,
      "roleId": 5,
      "permissionId": 14,
      "value": 2, // Read own salary
      "key": "personal_salary_info",
      "scope": 2,
    },
    {
      "id": 47,
      "roleId": 5,
      "permissionId": 15,
      "value": 31, // Full access to CV
      "key": "CV",
      "scope": 1,
    },
    {
      "id": 48,
      "roleId": 5,
      "permissionId": 16,
      "value": 31, // Full access to jobs
      "key": "jobs",
      "scope": 1,
    },
  ];

  // Deletes ALL existing entries
  return knex("role_permissions")
    .del()
    .then(async () => {
      // Inserts seed entries
      await knex("role_permissions").insert(data);
      await knex.raw(
        "select setval('role_permissions_id_seq', max(id)) from role_permissions"
      );
    });
}
