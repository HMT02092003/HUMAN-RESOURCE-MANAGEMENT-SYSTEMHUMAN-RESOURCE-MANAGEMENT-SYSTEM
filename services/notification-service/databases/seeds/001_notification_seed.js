export async function seed(knex) {
  await knex('notifications').del();
  await knex('notifications').insert([
    { name: 'Sample 1' },
    { name: 'Sample 2' }
  ]);
}
