import knex from 'knex';
import knexConfig from './knexfile.js';

const db = knex(knexConfig.development);

db('users')
  .where('status', 1)
  .select('id', 'username', 'fullName', 'roleId')
  .then(users => {
    console.log('Total users with status=1:', users.length);
    console.log('Sample:', users.slice(0, 5));
  })
  .finally(() => db.destroy());
