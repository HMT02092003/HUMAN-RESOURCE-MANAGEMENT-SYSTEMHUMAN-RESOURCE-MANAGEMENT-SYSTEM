import 'dotenv/config'; 
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;

const knexConfig = {
  development: {
    client: 'pg',
    connection: {
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_DATABASE,
      port: DB_PORT
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

  // production: {
  //   client: 'pg',
  //   connection: {
  //     host: 'localhost',
  //     user: 'postgres',
  //     password: '123456',
  //     database: 'DA1'
  //   },
  //   migrations: {
  //     directory: './databases/migrations',
  //     tableName: 'migrations'
  //   },
  //   seeds: {
  //     directory: './databases/seeds',
  //   }
  // }
};

export default knexConfig;