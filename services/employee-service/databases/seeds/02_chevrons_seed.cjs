/**
 * Seed file: Chevrons (Chức vụ)
 * Tạo các chức vụ với hệ số tương ứng
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('chevrons').del();

  // Dữ liệu chức vụ với hệ số
  const chevrons = [
    {
      id: 1,
      name: 'Nhân viên',
      description: 'Nhân viên chính thức',
      chevronCoefficient: 1.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Trưởng nhóm',
      description: 'Trưởng nhóm/Team Lead',
      chevronCoefficient: 1.3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Phó phòng',
      description: 'Phó phòng/Deputy Manager',
      chevronCoefficient: 1.6,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'Trưởng phòng',
      description: 'Trưởng phòng/Manager',
      chevronCoefficient: 2.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'Giám đốc',
      description: 'Giám đốc/Director',
      chevronCoefficient: 3.0,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert dữ liệu
  await knex('chevrons').insert(chevrons);
  
  // Reset sequence
  await knex.raw("SELECT setval('chevrons_id_seq', (SELECT MAX(id) FROM chevrons))");
  
  console.log('✅ Đã tạo 5 chức vụ với hệ số');
};
