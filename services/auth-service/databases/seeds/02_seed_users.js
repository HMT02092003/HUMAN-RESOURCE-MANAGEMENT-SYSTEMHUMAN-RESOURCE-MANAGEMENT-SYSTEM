export async function seed(knex) {
  // Helper to generate a random date (ISO string) between two dates
  const randomDate = (start, end) => {
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return d.toISOString();
  };

  // Helper to generate a phone number (VN-like) deterministically from an index
  const genPhone = (i) => {
    const prefix = ['090','091','092','093','094','095','096','097','098','099'][i % 10];
    return prefix + String(1000000 + i).slice(1);
  };

  // Example family profile (kept as JSON string for DB storage)
  const exampleFamily = JSON.stringify([
    {"name": "Thang", "birthday": "2025-10-30T17:00:00.000Z", "relationship": 1},
    {"name": "Nhung", "birthday": "2025-10-28T17:00:00.000Z", "relationship": 4}
  ]);

  // Base hashed password reused for all seeded accounts (same as previous seed)
  const hashedPassword = "$2a$12$ihZ5rvWqsxsdBNTeLmjz3uxdtt5Qs3eLbgNE4kRDiCILxVhT4D6vK"; // 123456@

  // Build seed users (1 admin + 9 regular users)
  const users = [];

  users.push({
    id: 1,
    username: 'admin',
    password: hashedPassword,
    fullName: 'Admin System',
    roleId: 1,
    status: 1,
    email: 'admin@example.com',
    phone: genPhone(1),
    gender: 1,
    birthday: randomDate(new Date('1975-01-01'), new Date('1995-12-31')),
    profileFamily: exampleFamily
  });

  for (let i = 2; i <= 10; i++) {
    users.push({
      id: i,
      username: `user${i}`,
      password: hashedPassword,
      fullName: `Nguyễn Văn User ${i}`,
      roleId: 2,
      status: 1,
      email: `user${i}@example.com`,
      phone: genPhone(i),
      gender: Math.floor(Math.random() * 3), // 0/1/2 possible values
      birthday: randomDate(new Date('1970-01-01'), new Date('2000-12-31')),
      profileFamily: exampleFamily
    });
  }

  // Deletes ALL existing entries then inserts new seed data
  await knex('users').del();
  await knex('users').insert(users);
  // Reset sequence to the max id
  await knex.raw("select setval('users_id_seq', (select max(id) from users))");
};
