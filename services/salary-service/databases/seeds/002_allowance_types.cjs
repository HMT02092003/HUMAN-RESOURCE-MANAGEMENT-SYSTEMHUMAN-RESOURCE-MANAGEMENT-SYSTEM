/**
 * Seed file: Allowance Types
 * Tạo các loại phụ cấp cơ bản cho công ty
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('allowance_types').del();

  const allowanceTypes = [
    {
      id: 1,
      name: 'Phụ cấp ăn trưa',
      description: 'Phụ cấp tiền ăn trưa hàng ngày',
      is_taxable: false,
      default_amount: 730000, // 730k/tháng (khoảng 30k/ngày x 22 ngày)
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Phụ cấp xăng xe',
      description: 'Phụ cấp chi phí đi lại, xăng xe',
      is_taxable: false,
      default_amount: 1000000, // 1 triệu/tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Phụ cấp điện thoại',
      description: 'Phụ cấp chi phí điện thoại, liên lạc công việc',
      is_taxable: false,
      default_amount: 300000, // 300k/tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Phụ cấp nhà ở',
      description: 'Phụ cấp chi phí thuê nhà, chỗ ở',
      is_taxable: true,
      default_amount: 2000000, // 2 triệu/tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'Phụ cấp chức vụ',
      description: 'Phụ cấp dành cho cấp quản lý',
      is_taxable: true,
      default_amount: 3000000, // 3 triệu/tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'Phụ cấp độc hại',
      description: 'Phụ cấp làm việc trong môi trường độc hại, nguy hiểm',
      is_taxable: false,
      default_amount: 1500000, // 1.5 triệu/tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 7,
      name: 'Phụ cấp trách nhiệm',
      description: 'Phụ cấp cho vị trí có trách nhiệm đặc biệt',
      is_taxable: true,
      default_amount: 2500000, // 2.5 triệu/tháng
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 8,
      name: 'Phụ cấp làm thêm giờ',
      description: 'Phụ cấp cho giờ làm ngoài giờ hành chính',
      is_taxable: true,
      default_amount: 0, // Tính theo giờ, không có mức cố định
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert dữ liệu
  await knex('allowance_types').insert(allowanceTypes);
  
  // Reset sequence
  await knex.raw("SELECT setval('allowance_types_id_seq', (SELECT MAX(id) FROM allowance_types))");
  
  console.log('✅ Đã tạo 8 loại phụ cấp cơ bản');
};
