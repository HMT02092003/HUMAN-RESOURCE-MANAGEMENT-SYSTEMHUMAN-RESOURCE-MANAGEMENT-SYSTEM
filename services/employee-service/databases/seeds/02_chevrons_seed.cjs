/**
 * Seed file: Chevrons (Chức vụ)
 * Tạo các chức vụ thực tế trong doanh nghiệp
 * Phân cấp: C-Suite -> Quản lý -> Chuyên gia -> Nhân viên -> Thực tập sinh
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('chevrons').del();

  // Dữ liệu chức vụ thực tế với hệ số tương ứng
  const chevrons = [
    // === CẤP LÃNH ĐẠO CAO (C-Suite) ===
    {
      id: 1,
      name: 'CEO',
      description: 'Chief Executive Officer - Giám đốc điều hành',
      chevronCoefficient: 5.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'COO',
      description: 'Chief Operating Officer - Giám đốc vận hành',
      chevronCoefficient: 4.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'CFO',
      description: 'Chief Financial Officer - Giám đốc tài chính',
      chevronCoefficient: 4.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      name: 'CTO',
      description: 'Chief Technology Officer - Giám đốc công nghệ',
      chevronCoefficient: 4.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'CMO',
      description: 'Chief Marketing Officer - Giám đốc marketing',
      chevronCoefficient: 4.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'CHRO',
      description: 'Chief Human Resources Officer - Giám đốc nhân sự',
      chevronCoefficient: 4.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // === CẤP QUẢN LÝ (Management) ===
    {
      id: 7,
      name: 'Director',
      description: 'Giám đốc bộ phận/chi nhánh',
      chevronCoefficient: 3.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 8,
      name: 'Head of Department',
      description: 'Trưởng bộ phận',
      chevronCoefficient: 3.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 9,
      name: 'Manager',
      description: 'Quản lý/Trưởng phòng',
      chevronCoefficient: 2.5,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // === CẤP GIÁM SÁT & CHUYÊN GIA ===
    {
      id: 10,
      name: 'Team Leader',
      description: 'Trưởng nhóm',
      chevronCoefficient: 2.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 11,
      name: 'Supervisor',
      description: 'Giám sát viên',
      chevronCoefficient: 1.8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 12,
      name: 'Specialist',
      description: 'Chuyên gia',
      chevronCoefficient: 2.2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 13,
      name: 'Senior Staff',
      description: 'Nhân viên cấp cao',
      chevronCoefficient: 1.6,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // === CẤP NHÂN VIÊN ===
    {
      id: 14,
      name: 'Staff',
      description: 'Nhân viên',
      chevronCoefficient: 1.2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 15,
      name: 'Junior Staff',
      description: 'Nhân viên sơ cấp',
      chevronCoefficient: 1.0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 16,
      name: 'Intern',
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
  
  console.log('✅ Đã tạo 16 chức vụ thực tế (C-Suite -> Management -> Staff -> Intern)');
};
