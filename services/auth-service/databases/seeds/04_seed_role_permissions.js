export async function seed(knex) {
  const data = [
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
