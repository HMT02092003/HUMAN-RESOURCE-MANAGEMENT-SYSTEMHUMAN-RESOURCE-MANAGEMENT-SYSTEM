
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

console.log('Attempting to connect to attendance_service_final on port 5433...');

knex.raw('SELECT 1+1 as result')
    .then(res => {
        console.log('✅ Connection successful:', res.rows[0]);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed:', err);
        process.exit(1);
    });
