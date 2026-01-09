/**
 * Seed data mẫu cho testing
 */

export async function seed(knex) {
  // Xóa data cũ
  await knex('user_devices').del();
  await knex('notifications').del();

  // Insert sample notifications
  await knex('notifications').insert([
    {
      user_id: 1,
      title: 'Đơn nghỉ phép được duyệt',
      content: 'Đơn nghỉ phép của bạn từ ngày 10/01 đến 12/01 đã được phê duyệt',
      type: 'LEAVE_APPROVE',
      data: JSON.stringify({
        leave_id: 123,
        approver_name: 'Nguyễn Văn A',
        start_date: '2026-01-10',
        end_date: '2026-01-12'
      }),
      is_read: false
    },
    {
      user_id: 1,
      title: 'Cập nhật lương tháng 12',
      content: 'Lương tháng 12/2025 đã được cập nhật. Vui lòng kiểm tra.',
      type: 'SALARY_UPDATE',
      data: JSON.stringify({
        month: 12,
        year: 2025,
        amount: 15000000
      }),
      is_read: false
    },
    {
      user_id: 1,
      title: 'Nhiệm vụ mới được giao',
      content: 'Bạn được giao nhiệm vụ: Phát triển tính năng thông báo',
      type: 'TASK_ASSIGN',
      data: JSON.stringify({
        task_id: 456,
        task_name: 'Phát triển notification service',
        deadline: '2026-01-15'
      }),
      is_read: true
    }
  ]);

  console.log('✅ Seed data inserted');
}
