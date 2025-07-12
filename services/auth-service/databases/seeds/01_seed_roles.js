export async function seed(knex) {
  const data = [
    {
      id: 1,
      name: "Admin",
      description: "Admin",
      key: "root",
    },
    {
      id: 2,
      name: "Nhân viên",
      description: "Nhân viên",
      key: "employee",
    },
    {
      id: 3,
      name: "Trưởng phòng",
      description: "Trưởng phòng",
      key: "leader",
    },
    {
      id: 4,
      name: "Kế toán",
      description: "Kế toán",
      key: "accountant",
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
