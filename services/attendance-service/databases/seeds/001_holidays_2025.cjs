exports.seed = async function(knex) {
  // Deletes ALL existing entries (careful in production!)
  await knex('holidays').del();

  const holidays = [
    { name: 'Tết Dương Lịch', date: '2025-01-01', description: 'New Year\'s Day' },
    // Tết: consider multi-day holiday range (example: Feb 9 - Feb 16 inclusive)
    { name: 'Tết Nguyên Đán (Lunar New Year) - Tết', date: '2025-02-10', start_date: '2025-02-09', end_date: '2025-02-16', description: 'Tết Nguyên Đán (estimate)', importance: 1 },
    { name: 'Giỗ Tổ Hùng Vương', date: '2025-04-21', description: 'Hung Kings\' Commemoration' },
    { name: 'Ngày Giải phóng miền Nam', date: '2025-04-30', description: 'Reunification Day' },
    { name: 'Quốc tế Lao động', date: '2025-05-01', description: 'International Workers\' Day' },
    { name: 'Quốc khánh', date: '2025-09-02', description: 'National Day' },
    { name: 'Giáng sinh', date: '2025-12-25', description: 'Christmas Day' }
  ];

  await knex('holidays').insert(holidays.map(h => ({
    name: h.name,
    description: h.description || null,
    importance: h.importance || 0,
    date: h.date,
    start_date: h.start_date || null,
    end_date: h.end_date || null
  })));

  console.log('✅ Seeded holidays for 2025');
};
