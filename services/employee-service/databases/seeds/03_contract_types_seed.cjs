/**
 * Seed file: Contract Types (Loại hợp đồng)
 * Tạo các loại hợp đồng lao động theo thực tế công ty
 */

exports.seed = async function(knex) {
  // Thay vì xóa toàn bộ (gây lỗi khi bảng contracts tham chiếu),
  // ta sử dụng upsert: insert mới hoặc cập nhật nếu đã tồn tại.

  // Dữ liệu loại hợp đồng
  const contractTypes = [
    {
      id: 1,
      name: 'Hợp đồng thử việc',
      type: 1,
      insurance: 0, // Không đóng bảo hiểm trong thời gian thử việc
      description: 'Hợp đồng thử việc 2 tháng',
      contractTerm: 2, // 2 tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Hợp đồng xác định thời hạn 1 năm',
      type: 2,
      insurance: 1, // Có đóng bảo hiểm
      description: 'Hợp đồng xác định thời hạn 12 tháng',
      contractTerm: 12, // 12 tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Hợp đồng xác định thời hạn 2 năm',
      type: 3,
      insurance: 1, // Có đóng bảo hiểm
      description: 'Hợp đồng xác định thời hạn 24 tháng',
      contractTerm: 24, // 24 tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Hợp đồng không xác định thời hạn',
      type: 4,
      insurance: 1, // Có đóng bảo hiểm
      description: 'Hợp đồng không xác định thời hạn (Chính thức)',
      contractTerm: null, // Không giới hạn thời gian
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert dữ liệu (upsert - tránh xóa để không phá rối FK)
  await knex('contract_types')
    .insert(contractTypes)
    .onConflict('id')
    .merge();
  
  // Reset sequence
  await knex.raw("SELECT setval('contract_types_id_seq', (SELECT MAX(id) FROM contract_types))");
  
  console.log('✅ Đã tạo 4 loại hợp đồng lao động');
};
