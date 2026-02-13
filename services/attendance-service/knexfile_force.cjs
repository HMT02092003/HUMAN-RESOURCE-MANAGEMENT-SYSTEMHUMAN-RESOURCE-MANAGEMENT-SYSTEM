
const knexConfig = {
    development: {
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            port: 5433,
            database: 'attendance_service_final',
            user: 'postgres',
            password: '123456'
        },
        pool: { min: 2, max: 10 },
        migrations: {
            tableName: 'knex_migrations',
            directory: './databases/migrations'
        },
        seeds: {
            directory: './databases/seeds'
        }
    }
};
module.exports = knexConfig;
