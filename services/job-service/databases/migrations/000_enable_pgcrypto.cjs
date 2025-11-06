exports.up = async function(knex) {
  // Enable pgcrypto extension which provides gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');
};

exports.down = async function(knex) {
  await knex.raw('DROP EXTENSION IF EXISTS pgcrypto');
};
