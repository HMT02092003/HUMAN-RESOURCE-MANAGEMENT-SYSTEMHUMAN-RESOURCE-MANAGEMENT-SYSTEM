import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms_db'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations'
  }
};

let connection = null;

export function getDatabaseConnection() {
  if (!connection) {
    connection = knex(dbConfig);
  }
  return connection;
}

export function closeDatabaseConnection() {
  if (connection) {
    connection.destroy();
    connection = null;
  }
}

export default getDatabaseConnection;
