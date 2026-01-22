// ============================================================================
// KNEX DATABASE CONFIGURATION
// ============================================================================
// Ưu tiên env variables từ Docker/System trước, sau đó mới load .env file
// Điều này đảm bảo CI/CD inject đúng secrets vào container
// ============================================================================

// Only load .env if running locally (không có NODE_ENV hoặc NODE_ENV=development)
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  // Try to load .env file (local development only)
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
    console.log('✅ Loaded .env file for local development');
  } catch (err) {
    console.log('⚠️  dotenv not loaded (running in production mode)');
  }
}

// Log database configuration source for debugging
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'job_service',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432
};

// Validation và logging
if (!process.env.DB_USER && !process.env.POSTGRES_USER) {
  console.warn('⚠️  WARNING: DB_USER không được set! Đang dùng default "postgres"');
  console.warn('   → Trong production, đảm bảo Docker env hoặc .env.docker có DB_USER');
}

// Log connection info (ẩn password)
console.log('🔌 Database Connection Config:');
console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   Password: ${dbConfig.password ? '***' : '(empty)'}`);

// Construct connection
const useDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0);
const connection = useDatabaseUrl ? process.env.DATABASE_URL : dbConfig;

if (useDatabaseUrl) {
  console.log('📎 Using DATABASE_URL connection string');
}

export default {
  development: {
    client: 'pg',
    connection,
    migrations: {
      directory: './databases/migrations'
    },
    seeds: {
      directory: './databases/seeds'
    }
  },
  production: {
    client: 'pg',
    connection,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './databases/migrations'
    },
    acquireConnectionTimeout: 10000
  }
};
