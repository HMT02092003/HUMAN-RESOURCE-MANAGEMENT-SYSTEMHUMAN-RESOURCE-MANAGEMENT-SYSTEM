exports.up = async function(knex) {
  const has = async (col) => {
    const r = await knex('information_schema.columns').where({ table_name: 'monthly_summaries', column_name: col }).first();
    return !!r;
  };

  const actions = [];
  if (!await has('totalLateDays')) actions.push(() => knex.schema.alterTable('monthly_summaries', t => t.integer('totalLateDays').defaultTo(0)));
  if (!await has('totalEarlyLeaveDays')) actions.push(() => knex.schema.alterTable('monthly_summaries', t => t.integer('totalEarlyLeaveDays').defaultTo(0)));
  if (!await has('totalOvertimeDays')) actions.push(() => knex.schema.alterTable('monthly_summaries', t => t.integer('totalOvertimeDays').defaultTo(0)));
  if (!await has('totalUnpaidLeaveDays')) actions.push(() => knex.schema.alterTable('monthly_summaries', t => t.integer('totalUnpaidLeaveDays').defaultTo(0)));
  if (!await has('totalLatePenalty')) actions.push(() => knex.schema.alterTable('monthly_summaries', t => t.decimal('totalLatePenalty',15,2).defaultTo(0)));
  if (!await has('totalEarlyLeavePenalty')) actions.push(() => knex.schema.alterTable('monthly_summaries', t => t.decimal('totalEarlyLeavePenalty',15,2).defaultTo(0)));

  for (const a of actions) await a();
};

exports.down = async function(knex) {
  const dropIfExists = async (col) => {
    const r = await knex('information_schema.columns').where({ table_name: 'monthly_summaries', column_name: col }).first();
    if (r) await knex.schema.alterTable('monthly_summaries', t => t.dropColumn(col));
  };

  await dropIfExists('totalLateDays');
  await dropIfExists('totalEarlyLeaveDays');
  await dropIfExists('totalOvertimeDays');
  await dropIfExists('totalUnpaidLeaveDays');
  await dropIfExists('totalLatePenalty');
  await dropIfExists('totalEarlyLeavePenalty');
};
