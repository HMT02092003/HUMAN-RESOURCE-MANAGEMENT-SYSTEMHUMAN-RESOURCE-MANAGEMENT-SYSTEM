export async function seed(knex) {
  const data = [
    {
      id: 1,
      name: "Admin",
      description: "Quản trị viên hệ thống",
      key: "root",
    },
    {
      id: 2,
      name: "Nhân viên",
      description: "Nhân viên thực thi",
      key: "employee",
    },
    {
      id: 3,
      name: "Quản lý",
      description: "Cấp quản lý (Team Leader, Manager, Director)",
      key: "leader",
      parentId: 2 // kế thừa quyền từ Nhân viên
    },
    {
      id: 4,
      name: "Kế toán",
      description: "Nhân viên kế toán/tài chính",
      key: "accountant",
      parentId: 2 // kế thừa quyền cơ bản của Nhân viên
    },
    {
      id: 5,
      name: "Nhân sự",
      description: "Nhân viên nhân sự",
      key: "hr",
      parentId: 2 // kế thừa quyền cơ bản của Nhân viên
    },
  ];

  // Deletes ALL existing entries
  return knex("roles")
    .del()
    .then(async () => {
      // Inserts seed entries
      await knex("roles").insert(data);
      await knex.raw("select setval('roles_id_seq', max(id)) from roles");
    });
};
