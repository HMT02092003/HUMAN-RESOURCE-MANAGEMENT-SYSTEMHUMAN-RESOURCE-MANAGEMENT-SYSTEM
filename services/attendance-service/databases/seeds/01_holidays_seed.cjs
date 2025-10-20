/**
 * Seed: Thêm dữ liệu các ngày nghỉ lễ của Việt Nam (2025 & 2026)
 */
exports.seed = async function(knex) {
  // Xóa toàn bộ dữ liệu cũ để tránh trùng lặp
  await knex('holidays').del();

  await knex('holidays').insert([
    // --- Năm 2025 ---
    {
      name: 'Tết Dương lịch 2025',
      description: 'Nghỉ Tết Dương lịch',
      importance: 5,
      start_date: '2025-01-01',
      end_date: '2025-01-01'
    },
    {
      name: 'Tết Nguyên Đán 2025 (Ất Tỵ)',
      description: 'Nghỉ Tết Âm lịch',
      importance: 5,
      start_date: '2025-01-28', // 29 tháng Chạp năm Giáp Thìn
      end_date: '2025-02-03'   // Mùng 5 tháng Giêng năm Ất Tỵ
    },
    {
      name: 'Giỗ Tổ Hùng Vương 2025',
      description: 'Nghỉ lễ Giỗ Tổ Hùng Vương (Mùng 10/3 Âm lịch)',
      importance: 4,
      start_date: '2025-04-07',
      end_date: '2025-04-07'
    },
    {
      name: 'Ngày Giải phóng miền Nam 2025',
      description: 'Nghỉ lễ 30/4',
      importance: 5,
      start_date: '2025-04-30',
      end_date: '2025-04-30'
    },
    {
      name: 'Ngày Quốc tế Lao động 2025',
      description: 'Nghỉ lễ 1/5',
      importance: 5,
      start_date: '2025-05-01',
      end_date: '2025-05-01'
    },
    {
      name: 'Ngày Quốc khánh 2025',
      description: 'Nghỉ lễ Quốc khánh 2/9',
      importance: 5,
      start_date: '2025-09-01',
      end_date: '2025-09-02'
    },
  ]);
};