exports.up = function (knex) {
    return knex.schema.alterTable('chevrons', function (table) {
        table.dropColumn('chevronCoefficient');
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('chevrons', function (table) {
        table.decimal('chevronCoefficient', 10, 2).nullable();
    });
};
