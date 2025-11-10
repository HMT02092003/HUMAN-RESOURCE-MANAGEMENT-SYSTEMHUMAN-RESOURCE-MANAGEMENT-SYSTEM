/**
 * Seed file: Chevrons (Chức vụ)
 * Tạo các chức vụ thiết yếu cho công ty nhỏ
 * Phân cấp: Ban Giám đốc -> Quản lý -> Nhân viên -> Thực tập sinh
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('chevrons').del();

  // Dữ liệu chức vụ tối ưu cho công ty nhỏ
  const chevrons = [
    // === CẤP LÃNH ĐẠO ===
    {
      id: 1,
      name: 'CEO',
      description: 'Giám đốc điều hành',
      chevronCoefficient: 5.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Giám đốc',
      description: 'Giám đốc bộ phận/chi nhánh',
      chevronCoefficient: 4.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // === CẤP QUẢN LÝ ===
    {
      id: 3,
      name: 'Trưởng phòng',
      description: 'Quản lý/Trưởng phòng',
      chevronCoefficient: 2.8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Phó phòng',
      description: 'Phó phòng/Trợ lý quản lý',
      chevronCoefficient: 2.3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'Team Leader',
      description: 'Trưởng nhóm',
      chevronCoefficient: 2.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // === CẤP CHUYÊN VIÊN ===
    {
      id: 6,
      name: 'Chuyên viên cao cấp',
      description: 'Chuyên viên cấp cao/Senior',
      chevronCoefficient: 1.8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 7,
      name: 'Chuyên viên',
      description: 'Chuyên viên/Specialist',
      chevronCoefficient: 1.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // === CẤP NHÂN VIÊN ===
    {
      id: 8,
      name: 'Nhân viên',
      description: 'Nhân viên thực hiện',
      chevronCoefficient: 1.2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 9,
      name: 'Nhân viên sơ cấp',
      description: 'Nhân viên mới/Junior',
      chevronCoefficient: 1.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 10,
      name: 'Thực tập sinh',
      description: 'Thực tập sinh',
      chevronCoefficient: 0.6,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert dữ liệu
  await knex('chevrons').insert(chevrons);
  
  // Reset sequence
  await knex.raw("SELECT setval('chevrons_id_seq', (SELECT MAX(id) FROM chevrons))");
  
  console.log('✅ Đã tạo 10 chức vụ thiết yếu (công ty nhỏ)');
};
