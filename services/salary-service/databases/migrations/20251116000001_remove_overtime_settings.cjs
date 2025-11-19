/**
 * Migration: Xóa settings OT khỏi salary-service
 * Các settings này đã được chuyển sang attendance-service và tính theo công
 */

exports.up = async function(knex) {
  // Xóa các settings OT cũ (tính theo lương)
  await knex('settings')
    .whereIn('key', ['OvertimeRate', 'HolidayRate'])
    .del();
};

exports.down = async function(knex) {
  // Khôi phục lại settings (nếu cần rollback)
  await knex('settings').insert([
    {
      key: 'OvertimeRate',
      name: 'Tỉ lệ lương OT ngày thường',
      value: JSON.stringify({ rate: 1.5 }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      key: 'HolidayRate',
      name: 'Tỉ lệ lương OT ngày lễ',
      value: JSON.stringify({ rate: 3.0 }),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]).onConflict('key').ignore();
};
