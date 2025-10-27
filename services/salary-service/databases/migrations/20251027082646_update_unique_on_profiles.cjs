// migrations/YYYYMMDDHHMMSS_update_unique_on_profiles.cjs

exports.up = async function(knex) {
  // Ensure per-column unique indexes are removed if present
  await knex.raw("DROP INDEX IF EXISTS employee_salary_profiles_user_id_unique;");
  await knex.raw("DROP INDEX IF EXISTS employee_salary_profiles_tax_code_unique;");

  // Create composite unique index if it doesn't already exist
  await knex.raw("CREATE UNIQUE INDEX IF NOT EXISTS employee_salary_profiles_user_effective_from_key ON employee_salary_profiles (user_id, effective_from);");
};

exports.down = async function(knex) {
  // Drop composite unique index if exists
  await knex.raw("DROP INDEX IF EXISTS employee_salary_profiles_user_effective_from_key;");

  // Recreate original per-column unique indexes if they don't exist
  await knex.raw("CREATE UNIQUE INDEX IF NOT EXISTS employee_salary_profiles_tax_code_unique ON employee_salary_profiles (tax_code);");
  await knex.raw("CREATE UNIQUE INDEX IF NOT EXISTS employee_salary_profiles_user_id_unique ON employee_salary_profiles (user_id);");
};
