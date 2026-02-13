
const knex = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        port: 5433,
        user: 'postgres',
        password: '123456',
        database: 'attendance_service_final'
    }
});

const seedFile = require('./databases/seeds/44_seed_oct_nov_dec_2025_final.cjs');

console.log('--- STARTING MANUAL SEED ---');
seedFile.seed(knex)
    .then(() => {
        console.log('--- MANUAL SEED SUCCESS ---');
        knex.destroy();
        process.exit(0);
    })
    .catch((err) => {
        console.error('--- MANUAL SEED FAILED ---', err);
        process.exit(1);
    });
