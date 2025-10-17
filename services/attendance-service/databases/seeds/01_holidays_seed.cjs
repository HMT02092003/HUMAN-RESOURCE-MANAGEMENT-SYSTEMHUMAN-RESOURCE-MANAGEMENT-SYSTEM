/**
 * Seed: insert sample holiday ranges into holidays table
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries (keep this safe in development)
  await knex('holidays').del();

  await knex('holidays').insert([
    {
      name: 'New Year',
      description: 'New Year holiday',
      importance: 5,
      start_date: '2026-01-01',
      end_date: '2026-01-01'
    },
    {
      name: 'Lunar New Year',
      description: 'Tet holiday',
      importance: 5,
      start_date: '2026-02-10',
      end_date: '2026-02-16'
    },
    {
      name: 'Reunification Day',
      description: 'Reunification Day',
      importance: 4,
      start_date: '2026-04-30',
      end_date: '2026-04-30'
    }
  ]);
};
