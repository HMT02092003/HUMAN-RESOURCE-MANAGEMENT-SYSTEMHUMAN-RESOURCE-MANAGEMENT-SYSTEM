/**
 * Migration: Replace firstName and lastName with fullName
 * Date: 2025-11-06
 * Description: Consolidate firstName and lastName columns into a single fullName column
 */

export async function up(knex) {
  return knex.schema.table('users', function (table) {
    // Add fullName column
    table.string('fullName', 100).nullable();
  }).then(async () => {
    // Migrate existing data: concatenate lastName + ' ' + firstName
    await knex.raw(`
      UPDATE users 
      SET "fullName" = TRIM(CONCAT(COALESCE("lastName", ''), ' ', COALESCE("firstName", '')))
      WHERE "lastName" IS NOT NULL OR "firstName" IS NOT NULL
    `);
    
    // Drop old columns
    return knex.schema.table('users', function (table) {
      table.dropColumn('firstName');
      table.dropColumn('lastName');
    });
  });
}

export async function down(knex) {
  return knex.schema.table('users', function (table) {
    // Re-add firstName and lastName columns
    table.string('firstName', 50).nullable();
    table.string('lastName', 50).nullable();
  }).then(async () => {
    // Try to split fullName back (simple split by space - first word = lastName, rest = firstName)
    await knex.raw(`
      UPDATE users
      SET 
        "lastName" = SPLIT_PART("fullName", ' ', 1),
        "firstName" = TRIM(SUBSTRING("fullName" FROM LENGTH(SPLIT_PART("fullName", ' ', 1)) + 2))
      WHERE "fullName" IS NOT NULL AND "fullName" != ''
    `);
    
    // Drop fullName column
    return knex.schema.table('users', function (table) {
      table.dropColumn('fullName');
    });
  });
}
