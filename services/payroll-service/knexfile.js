require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_DATABASE || 'payroll_service',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456'
    },
    pool: { min: 2, max: 10 },
    migrations: { tableName: 'knex_migrations', directory: './databases/migrations' },
    seeds: { directory: './databases/seeds' }
  },
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    },
    pool: { min: 2, max: 10 },
    migrations: { tableName: 'knex_migrations', directory: './databases/migrations' }
  }
}; 