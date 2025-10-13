/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Check if setting exists
  const existing = await knex('settings')
    .where('key', 'unauthorizedAbsencePenaltyPerDay')
    .first();
  
  if (!existing) {
    // Insert new setting
    await knex('settings').insert({
      key: 'unauthorizedAbsencePenaltyPerDay',
      name: 'Tiền phạt nghỉ không phép mỗi ngày (VND)',
      value: '500000', // Default 500,000 VND per day
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('✅ Added unauthorizedAbsencePenaltyPerDay setting');
  } else {
    console.log('ℹ️ unauthorizedAbsencePenaltyPerDay setting already exists');
  }
};

