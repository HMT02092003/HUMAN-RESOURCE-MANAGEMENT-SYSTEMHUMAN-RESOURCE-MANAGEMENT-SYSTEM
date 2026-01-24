/**
 * Seed: Thêm dữ liệu các ngày nghỉ lễ của Việt Nam (2025 & 2026)
 */
exports.seed = async function (knex) {
  // Xóa toàn bộ dữ liệu cũ để tránh trùng lặp
  await knex('holidays').del();

  await knex('holidays').insert([
    // --- Năm 2026 ---
    {
      name: 'Tết Dương lịch 2026',
      description: 'Nghỉ Tết Dương lịch',
      importance: 5,
      start_date: '2026-01-01',
      end_date: '2026-01-01'
    },
    {
      name: 'Tết Nguyên Đán 2026 (Bính Ngọ)',
      description: 'Nghỉ Tết Âm lịch 2026',
      importance: 5,
      start_date: '2026-02-14', // 27 tháng Chạp năm Ất Tỵ (Thường bắt đầu nghỉ sớm)
      end_date: '2026-02-22'   // Mùng 5 tháng Giêng năm Bính Ngọ
    },
    {
      name: 'Giỗ Tổ Hùng Vương 2026',
      description: 'Nghỉ lễ Giỗ Tổ Hùng Vương (Mùng 10/3 Âm lịch)',
      importance: 4,
      start_date: '2026-04-26', // Mùng 10/3 Âm lịch
      end_date: '2026-04-27'   // Nghỉ bù (vì 10/3 rơi vào Chủ nhật)
    },
    {
      name: 'Ngày Giải phóng miền Nam 2026',
      description: 'Nghỉ lễ 30/4',
      importance: 5,
      start_date: '2026-04-30',
      end_date: '2026-04-30'
    },
    {
      name: 'Ngày Quốc tế Lao động 2026',
      description: 'Nghỉ lễ 1/5',
      importance: 5,
      start_date: '2026-05-01',
      end_date: '2026-05-01'
    },
    {
      name: 'Ngày Quốc khánh 2026',
      description: 'Nghỉ lễ Quốc khánh 2/9',
      importance: 5,
      start_date: '2026-09-01',
      end_date: '2026-09-02'
    }
  ]);
};