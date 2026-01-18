exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('monthly_payslips');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('monthly_payslips', 'deduction_details');
  if (!hasColumn) {
    await knex.schema.table('monthly_payslips', function(table) {
      table.jsonb('deduction_details').defaultTo(knex.raw("'[]'::jsonb"));
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('monthly_payslips');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('monthly_payslips', 'deduction_details');
  if (hasColumn) {
    await knex.schema.table('monthly_payslips', function(table) {
      table.dropColumn('deduction_details');
    });
  }
};
