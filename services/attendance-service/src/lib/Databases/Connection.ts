import dotenv from 'dotenv';
dotenv.config();

import knex from 'knex';
import { Model } from 'objection';

const knexInstance = knex({
  client: 'pg',
  connection: {
    host: process.env['DB_HOST'] as string,
    port: Number(process.env['DB_PORT']),
    user: process.env['DB_USER'] as string,
    password: process.env['DB_PASSWORD'] as string,
    database: process.env['DB_DATABASE'] as string,
  },
  pool: { min: 0, max: 10 },
});

Model.knex(knexInstance);

export default knexInstance;