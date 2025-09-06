export async function seed(knex) {
  const data = [
    {
      "id": 1,
      "username": "admin",
      "password": "$2a$12$ihZ5rvWqsxsdBNTeLmjz3uxdtt5Qs3eLbgNE4kRDiCILxVhT4D6vK", // 123456@
      "firstName": "Admin",
      "lastName": "Admin",
      "roleId": 1,
      "status": 1  
    }
  ]

  // Deletes ALL existing entries
  return knex('users').del()
    .then(async () => {
      // Inserts seed entries
      await knex('users').insert(data);
      await knex.raw('select setval(\'users_id_seq\', max(id)) from users');
    });
};
