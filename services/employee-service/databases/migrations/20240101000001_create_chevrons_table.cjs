exports.up = function(knex) {
  return knex.schema.createTable('chevrons', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('chevrons');
}; 

// [
//   {
//     id:abc,
//     udid:efg,
//     file: [file]
//   },
//   {
//     id:abc,
//     udid:efg,
//     file:  [file]
//   },
//   {
//     id:abc,
//     udid:efg,
//     file:  [file]
//   },
// ]