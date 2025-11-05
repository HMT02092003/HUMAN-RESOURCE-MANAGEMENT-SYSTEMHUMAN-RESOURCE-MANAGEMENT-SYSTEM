/**
 * Seed file: Departments (Phòng ban)
 * Tạo các phòng ban thực tế của doanh nghiệp
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('departments').del();

  // Dữ liệu phòng ban thực tế
  const departments = [
    {
      id: 1,
      name: 'Ban Giám đốc',
      description: 'Ban lãnh đạo điều hành công ty',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Phòng Công nghệ',
      description: 'Phòng Công nghệ thông tin - Phát triển sản phẩm và hệ thống',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Phòng Kinh doanh',
      description: 'Phòng Kinh doanh - Bán hàng và phát triển thị trường',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Phòng Marketing',
      description: 'Phòng Marketing - Truyền thông và xây dựng thương hiệu',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'P. Tài chính',
      description: 'Phòng Tài chính - Kế toán - Quản lý tài chính và kế toán',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'Phòng Nhân sự',
      description: 'Phòng Nhân sự - Quản lý nguồn nhân lực và đào tạo',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 7,
      name: 'P. Hành chính',
      description: 'Phòng Hành chính - Quản lý hành chính và tổng hợp',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 8,
      name: 'Phòng Vận hành',
      description: 'Phòng Vận hành - Quản lý quy trình và hoạt động',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert dữ liệu
  await knex('departments').insert(departments);
  
  // Reset sequence
  await knex.raw("SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments))");
  
  console.log('✅ Đã tạo 8 phòng ban thực tế');
};
