/**
 * Seed file: Contracts for 100 Employees
 * Tạo hợp đồng cho 100 nhân viên
 * Contract Types: 1=Thử việc, 2=1 năm, 3=2 năm, 4=Không xác định thời hạn
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ (giữ lại contracts của admin nếu có)
  await knex('contracts').where('userId', '>', 1).del();

  const contracts = [];
  
  // Hàm tính endDate dựa vào startDate và contractTerm (tháng)
  const calculateEndDate = (startDate, contractTerm) => {
    if (!contractTerm) return null; // Hợp đồng không xác định thời hạn
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + contractTerm);
    return endDate;
  };

  // === BAN GIÁM ĐỐC (userId 2-6): Hợp đồng không xác định thời hạn ===
  for (let userId = 2; userId <= 6; userId++) {
    const startDate = new Date('2020-01-15');
    contracts.push({
      contractTypeId: 4, // Không xác định thời hạn
      userId: userId,
      startDate: startDate,
      endDate: null,
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG CÔNG NGHỆ (userId 7-31) ===
  // Trưởng phòng, Phó phòng (7-8): Không xác định thời hạn
  for (let userId = 7; userId <= 8; userId++) {
    const startDate = new Date('2021-01-10');
    contracts.push({
      contractTypeId: 4,
      userId: userId,
      startDate: startDate,
      endDate: null,
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Team Leaders (9-11): Hợp đồng 2 năm
  for (let userId = 9; userId <= 11; userId++) {
    const startDate = new Date('2021-06-01');
    contracts.push({
      contractTypeId: 3, // 2 năm
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 24),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Chuyên viên cao cấp (12-16): Hợp đồng 2 năm
  for (let userId = 12; userId <= 16; userId++) {
    const startDate = new Date('2022-01-10');
    contracts.push({
      contractTypeId: 3,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 24),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Chuyên viên (17-24): Hợp đồng 1 năm
  for (let userId = 17; userId <= 24; userId++) {
    const startDate = new Date('2022-06-01');
    contracts.push({
      contractTypeId: 2, // 1 năm
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 12),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Nhân viên (25-29): Hợp đồng 1 năm
  for (let userId = 25; userId <= 29; userId++) {
    const startDate = new Date('2023-03-01');
    contracts.push({
      contractTypeId: 2,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 12),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Thực tập sinh (30-31): Thử việc 2 tháng
  for (let userId = 30; userId <= 31; userId++) {
    const startDate = new Date('2024-09-01');
    contracts.push({
      contractTypeId: 1, // Thử việc
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 2),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG KINH DOANH (userId 32-56) ===
  // Trưởng phòng, Phó phòng (32-33): Không xác định thời hạn
  for (let userId = 32; userId <= 33; userId++) {
    const startDate = new Date('2021-02-01');
    contracts.push({
      contractTypeId: 4,
      userId: userId,
      startDate: startDate,
      endDate: null,
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Team Leaders (34-36): Hợp đồng 2 năm
  for (let userId = 34; userId <= 36; userId++) {
    const startDate = new Date('2021-08-01');
    contracts.push({
      contractTypeId: 3,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 24),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Nhân viên kinh doanh (37-51): Hợp đồng 1 năm
  for (let userId = 37; userId <= 51; userId++) {
    const startDate = new Date('2022-03-01');
    contracts.push({
      contractTypeId: 2,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 12),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Thực tập sinh (52-56): Thử việc
  for (let userId = 52; userId <= 56; userId++) {
    const startDate = new Date('2024-09-01');
    contracts.push({
      contractTypeId: 1,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 2),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG MARKETING (userId 57-71) ===
  // Trưởng phòng, Phó phòng (57-58): Không xác định thời hạn
  for (let userId = 57; userId <= 58; userId++) {
    const startDate = new Date('2021-03-01');
    contracts.push({
      contractTypeId: 4,
      userId: userId,
      startDate: startDate,
      endDate: null,
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Team Leaders (59-60): Hợp đồng 2 năm
  for (let userId = 59; userId <= 60; userId++) {
    const startDate = new Date('2021-09-01');
    contracts.push({
      contractTypeId: 3,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 24),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Chuyên viên (61-68): Hợp đồng 1 năm
  for (let userId = 61; userId <= 68; userId++) {
    const startDate = new Date('2022-06-01');
    contracts.push({
      contractTypeId: 2,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 12),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Thực tập sinh (69-71): Thử việc
  for (let userId = 69; userId <= 71; userId++) {
    const startDate = new Date('2024-09-01');
    contracts.push({
      contractTypeId: 1,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 2),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG TÀI CHÍNH (userId 72-86) ===
  // Trưởng phòng, Phó phòng (72-73): Không xác định thời hạn
  for (let userId = 72; userId <= 73; userId++) {
    const startDate = new Date('2020-08-01');
    contracts.push({
      contractTypeId: 4,
      userId: userId,
      startDate: startDate,
      endDate: null,
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Chuyên viên cao cấp (74-76): Hợp đồng 2 năm
  for (let userId = 74; userId <= 76; userId++) {
    const startDate = new Date('2021-07-01');
    contracts.push({
      contractTypeId: 3,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 24),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Nhân viên (77-84): Hợp đồng 1 năm
  for (let userId = 77; userId <= 84; userId++) {
    const startDate = new Date('2022-05-01');
    contracts.push({
      contractTypeId: 2,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 12),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Thực tập sinh (85-86): Thử việc
  for (let userId = 85; userId <= 86; userId++) {
    const startDate = new Date('2024-09-01');
    contracts.push({
      contractTypeId: 1,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 2),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // === PHÒNG NHÂN SỰ (userId 87-101) ===
  // Trưởng phòng, Phó phòng (87-88): Không xác định thời hạn
  for (let userId = 87; userId <= 88; userId++) {
    const startDate = new Date('2020-09-01');
    contracts.push({
      contractTypeId: 4,
      userId: userId,
      startDate: startDate,
      endDate: null,
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Chuyên viên cao cấp (89-90): Hợp đồng 2 năm
  for (let userId = 89; userId <= 90; userId++) {
    const startDate = new Date('2021-08-01');
    contracts.push({
      contractTypeId: 3,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 24),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Nhân viên (91-99): Hợp đồng 1 năm
  for (let userId = 91; userId <= 99; userId++) {
    const startDate = new Date('2022-07-01');
    contracts.push({
      contractTypeId: 2,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 12),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Thực tập sinh (100-101): Thử việc
  for (let userId = 100; userId <= 101; userId++) {
    const startDate = new Date('2024-09-01');
    contracts.push({
      contractTypeId: 1,
      userId: userId,
      startDate: startDate,
      endDate: calculateEndDate(startDate, 2),
      activeDay: startDate,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Insert tất cả contracts
  await knex('contracts').insert(contracts);
  
  // Reset sequence
  await knex.raw("SELECT setval('contracts_id_seq', (SELECT MAX(id) FROM contracts))");
  
  console.log(`✅ Đã tạo ${contracts.length} hợp đồng cho 100 nhân viên`);
  console.log(`   - Hợp đồng không xác định thời hạn: ${contracts.filter(c => c.contractTypeId === 4).length}`);
  console.log(`   - Hợp đồng 2 năm: ${contracts.filter(c => c.contractTypeId === 3).length}`);
  console.log(`   - Hợp đồng 1 năm: ${contracts.filter(c => c.contractTypeId === 2).length}`);
  console.log(`   - Hợp đồng thử việc: ${contracts.filter(c => c.contractTypeId === 1).length}`);
};
