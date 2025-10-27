export async function seed(knex) {
  await knex('salarys').del();
  await knex('salarys').insert([
    { name: 'Sample 1' },
    { name: 'Sample 2' }
  ]);
}
