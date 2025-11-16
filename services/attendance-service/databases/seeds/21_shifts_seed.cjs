/**
 * Seed: Shifts (Các mẫu ca làm việc)
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('employee_schedules').del();
  await knex('shifts').del();

  // Thêm các mẫu ca
  await knex('shifts').insert([
    // Office / Hành chính variants
    {
      id: 1,
      name: 'Hành chính',
      start_time: '08:00:00',
      end_time: '17:00:00',
      working_unit: 1.0,
      description: 'Ca hành chính chuẩn (8:00-17:00)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Hành chính (linh hoạt 1)',
      start_time: '08:30:00',
      end_time: '17:30:00',
      working_unit: 1.0,
      description: 'Ca hành chính linh hoạt (8:30-17:30)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'Hành chính (linh hoạt 2)',
      start_time: '09:00:00',
      end_time: '18:00:00',
      working_unit: 1.0,
      description: 'Ca hành chính linh hoạt (9:00-18:00)',
      created_at: new Date(),
      updated_at: new Date()
    },

    // Part-time / Half-day shifts
    {
      id: 4,
      name: 'Ca Sáng (Nửa ngày)',
      start_time: '08:00:00',
      end_time: '12:00:00',
      working_unit: 0.5,
      description: 'Ca bán thời gian buổi sáng (8:00-12:00) - 0.5 công',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      name: 'Ca Chiều (Nửa ngày)',
      start_time: '13:00:00',
      end_time: '17:00:00',
      working_unit: 0.5,
      description: 'Ca bán thời gian buổi chiều (13:00-17:00) - 0.5 công',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      name: 'Ca Tối (Part-time)',
      start_time: '18:00:00',
      end_time: '22:00:00',
      working_unit: 0.5,
      description: 'Ca tối bán thời gian (18:00-22:00) - 0.5 công',
      created_at: new Date(),
      updated_at: new Date()
    },

    // F&B split shifts (Ca Gãy)
    {
      id: 7,
      name: 'Ca Gãy Sáng (F&B)',
      start_time: '10:00:00',
      end_time: '14:00:00',
      working_unit: 0.5,
      description: 'Ca gãy buổi sáng cho F&B (10:00-14:00) - 0.5 công',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 8,
      name: 'Ca Gãy Tối (F&B)',
      start_time: '18:00:00',
      end_time: '22:00:00',
      working_unit: 0.5,
      description: 'Ca gãy buổi tối cho F&B (18:00-22:00) - 0.5 công',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Seeded 8 shift templates (updated set) successfully');
};
