// ============================================================================
// KNEX DATABASE CONFIGURATION - Employee Service
// ============================================================================
// Ưu tiên env variables từ Docker/System trước, sau đó mới load .env file
// ============================================================================

// Only load .env if running locally
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (err) { /* Production mode */ }
}

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

if (!DB_USER) {
  console.warn('⚠️  WARNING: DB_USER not set! Using default "postgres"');
}

const knexConfig = {
  development: {
    client: 'pg',
    connection: {
      host: DB_HOST || 'localhost',
      user: DB_USER || 'postgres',
      password: DB_PASSWORD || '',
      database: DB_DATABASE || 'employee_service',
      port: DB_PORT ? Number(DB_PORT) : 5432
    },
    migrations: {
      directory: './databases/migrations',
      tableName: 'migrations'
    },
    seeds: {
      directory: './databases/seeds',
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user: 'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'pg',
    connection: {
      host: DB_HOST || 'localhost',
      user: DB_USER || 'postgres',
      password: DB_PASSWORD || '',
      database: DB_DATABASE || 'employee_service',
      port: DB_PORT ? Number(DB_PORT) : 5432
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './databases/migrations',
      tableName: 'migrations'
    },
    seeds: {
      directory: './databases/seeds',
    }
  }
};

export default knexConfig;