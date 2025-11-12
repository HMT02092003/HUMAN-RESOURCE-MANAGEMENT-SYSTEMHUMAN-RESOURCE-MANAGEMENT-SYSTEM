import Knex from 'knex';
import { Model } from 'objection';
// Use ESM import instead of require so this file works when run with tsx/node ESM loader
// knexfile.js is a JS config; TypeScript may not always find a declaration for the exact relative path
// @ts-ignore
import knexConfig from '../../knexfile.js';

const knex = Knex((knexConfig as any).development);
Model.knex(knex);

export type Database = typeof knex;

export default knex;
