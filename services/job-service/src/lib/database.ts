import Knex from 'knex';
import { Model } from 'objection';
// Use ESM import instead of require so this file works when run with tsx/node ESM loader
import knexConfig from '../../knexfile.ts';

const knex = Knex((knexConfig as any).development);
Model.knex(knex);

export type Database = typeof knex;

export default knex;
