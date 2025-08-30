import 'dotenv/config';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

const knexConfig = {
  development: {
    client: 'pg',
    connection: {
      host: DB_HOST || 'localhost',
      port: Number(DB_PORT) || 5432,
      database: DB_DATABASE || 'attendance_service',
      user: DB_USER || 'postgres',
      password: DB_PASSWORD || '123456'
    },
    pool: { min: 2, max: 10 },
    migrations: { 
      tableName: 'knex_migrations', 
      directory: './databases/migrations' 
    },
    seeds: { 
      directory: './databases/seeds' 
    }
  },
  production: {
    client: 'pg',
    connection: {
      host: DB_HOST,
      port: Number(DB_PORT),
      database: DB_DATABASE,
      user: DB_USER,
      password: DB_PASSWORD
    },
    pool: { min: 2, max: 10 },
    migrations: { 
      tableName: 'knex_migrations', 
      directory: './databases/migrations' 
    }
  }
};

export default knexConfig;