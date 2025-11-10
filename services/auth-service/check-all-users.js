import knex from 'knex';
import knexConfig from './knexfile.js';

const db = knex(knexConfig.development);

db('users')
  .select('id', 'username', 'fullName', 'status')
  .then(users => {
    console.log('Total users (all statuses):', users.length);
    const byStatus = users.reduce((acc, u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    }, {});
    console.log('By status:', byStatus);
    console.log('Sample users:', users.slice(0, 10).map(u => `ID:${u.id} ${u.username} status:${u.status}`));
  })
  .finally(() => db.destroy());
