const knex = require('knex');
const db = knex({
  client: 'pg',
  connection: 'postgresql://postgres:postgres@localhost:5433/hrms_db'
});

async function main() {
  const users = await db('users').whereIn('username', ['tech_mid022', 'mailtn']).select('id', 'username');
  console.log(users);
  process.exit();
}
main();
