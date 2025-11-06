export async function seed(knex) {
  const data = [
    {
      "id": 1,
      "name": "root",
      "description": "root",
      "value": 31,
      "key": "root",
    },
    {
      "id": 2,
      "name": "Quản lý người dùng",
      "description": "Quản lý người dùng",
      "value": 31,
      "key": "users",
    },
    {
      "id": 3,
      "name": "Quản lý vai trò",
      "description": "Quản lý vai trò",
      "value": 31,
      "key": "roles",
    },
    {
      "id": 4,
      "name": "Phân quyền",
      "description": "Phân quyền",
      "value": 2,
      "key": "decentralization",
    },
    {
      "id": 5,
      "name": "Đơn từ",
      "description": "Đơn từ",
      "value": 31,
      "key": "applications",
    },
    {
      "id": 6,
      "name": "Cài đặt",
      "description": "Cài đặt",
      "value": 31,
      "key": "settings",
    },
    {
      "id": 7,
      "name": "Quản lý hợp đồng",
      "description": "Quản lý hợp đồng",
      "value": 31,
      "key": "contractTypes",
    },
    {
      "id": 8,
      "name": "Quản lý chức vụ",
      "description": "Quản lý chức vụ",
      "value": 31,
      "key": "chevrons",
    },
    {
      "id": 9,
      "name": "Quản lý phòng ban",
      "description": "Quản lý phòng ban",
      "value": 31,
      "key": "departments",
    },
    {
      "id": 10,
      "name": "Dashboard",
      "description": "Dashboard",
      "value": 31,
      "key": "dashboard",
    },
    {
      "id": 11,
      "name": "Chấm công",
      "description": "Chấm công",
      "value": 31,
      "key": "timeAttendance",
    },
    {
      "id": 12,
      "name": "Quản lý phụ cấp",
      "description": "Quản lý phụ cấp",
      "value": 31,
      "key": "salary_allowances",
    },
    {
      "id": 13,
      "name": "Quản lý lương",
      "description": "Quản lý lương",
      "value": 31,
      "key": "salaries",
    },
    {
      "id": 14,
      "name": "Thông tin lương cá nhân",
      "description": "Thông tin lương cá nhân",
      "value": 31,
      "key": "personal_salary_info",
    },
    {
      "id": 15,
      "name": "Quản lý hò sơ nhân viên",
      "description": "Quản lý hò sơ nhân viên",
      "value": 31,
      "key": "CV",
    },
    {
      "id": 16,
      "name": "Quản lý công việc",
      "description": "Quản lý công việc",
      "value": 31,
      "key": "projects",
    }
  ];

  // Deletes ALL existing entries
  return knex("permissions")
    .del()
    .then(async () => {
      // Inserts seed entries
      await knex("permissions").insert(data);
      await knex.raw(
        "select setval('permissions_id_seq', max(id)) from permissions"
      );
    });
}
