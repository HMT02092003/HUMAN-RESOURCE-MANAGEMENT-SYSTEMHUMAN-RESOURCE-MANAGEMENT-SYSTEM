/**
 * Migration: Thêm settings OT theo công vào attendance-service
 * - OvertimeRateInUnits: Tỉ lệ công cho OT ngày thường (VD: 1.5)
 * - HolidayOvertimeRateInUnits: Tỉ lệ công cho OT ngày lễ (VD: 3.0)
 */

exports.up = async function(knex) {
  // Thêm setting OT ngày thường
  await knex('settings').insert({
    key: 'OvertimeRateInUnits',
    name: 'Tỉ lệ công OT ngày thường',
    value: JSON.stringify({ rate: 1.5 }),
    created_at: new Date(),
    updated_at: new Date()
  }).onConflict('key').ignore();

  // Thêm setting OT ngày lễ
  await knex('settings').insert({
    key: 'HolidayOvertimeRateInUnits',
    name: 'Tỉ lệ công OT ngày lễ',
    value: JSON.stringify({ rate: 3.0 }),
    created_at: new Date(),
    updated_at: new Date()
  }).onConflict('key').ignore();
};

exports.down = async function(knex) {
  await knex('settings')
    .whereIn('key', ['OvertimeRateInUnits', 'HolidayOvertimeRateInUnits'])
    .del();
};
