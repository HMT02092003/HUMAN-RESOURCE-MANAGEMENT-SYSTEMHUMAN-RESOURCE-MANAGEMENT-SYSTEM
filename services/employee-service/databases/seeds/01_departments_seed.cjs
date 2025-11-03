/**
 * Seed file: Departments (Phòng ban)
 * Tạo các phòng ban thực tế của công ty
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('departments').del();

  // Dữ liệu phòng ban
  const departments = [
    {
      id: 1,
      name: 'Phòng Kỹ thuật',
      description: 'Phòng Kỹ thuật - Phát triển sản phẩm và công nghệ',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Phòng Kinh doanh',
      description: 'Phòng Kinh doanh - Bán hàng và chăm sóc khách hàng',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Phòng Nhân sự',
      description: 'Phòng Nhân sự - Quản lý nguồn nhân lực',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Phòng Kế toán',
      description: 'Phòng Kế toán - Quản lý tài chính',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'Phòng Marketing',
      description: 'Phòng Marketing - Truyền thông và xây dựng thương hiệu',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'Phòng Hành chính',
      description: 'Phòng Hành chính - Quản lý hành chính tổng hợp',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert dữ liệu
  await knex('departments').insert(departments);
  
  // Reset sequence
  await knex.raw("SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments))");
  
  console.log('✅ Đã tạo 6 phòng ban');
};
