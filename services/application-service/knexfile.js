// ============================================================================
// KNEX DATABASE CONFIGURATION - Application Service
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

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'application_service',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432
};

if (!process.env.DB_USER) {
  console.warn('⚠️  WARNING: DB_USER not set! Using default "postgres"');
}

export default {
  development: {
    client: 'pg',
    connection: dbConfig,
    migrations: { directory: './databases/migrations' },
    seeds: { directory: './databases/seeds' }
  },
  production: {
    client: 'pg',
    connection: dbConfig,
    pool: { min: 2, max: 10 },
    migrations: { directory: './databases/migrations' }
  }
};
