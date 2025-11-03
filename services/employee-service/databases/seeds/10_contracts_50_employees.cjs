/**
 * Seed file: Contracts (Hợp đồng lao động)
 * Tạo hợp đồng cho 50 nhân viên (userId từ 1-50)
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('contracts').del();

  const contracts = [];
  
  // Hàm tính ngày kết thúc hợp đồng
  const addMonths = (date, months) => {
    if (!months) return null; // Hợp đồng không xác định thời hạn
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  // Phân bổ loại hợp đồng theo chức vụ và thời gian làm việc
  for (let userId = 1; userId <= 50; userId++) {
    let contractTypeId;
    let startDate;
    let endDate;
    let activeDay;
    
    if (userId === 1) {
      // Admin - Hợp đồng không xác định thời hạn
      contractTypeId = 4;
      startDate = new Date('2020-01-01');
      endDate = null;
      activeDay = new Date('2020-01-01');
    } else if (userId >= 2 && userId <= 10) {
      // Phòng Kỹ thuật - Nhân viên cũ, hợp đồng không xác định thời hạn
      contractTypeId = 4;
      startDate = new Date(2023, Math.floor(Math.random() * 12), 1);
      endDate = null;
      activeDay = startDate;
    } else if (userId >= 11 && userId <= 20) {
      // Phòng Kinh doanh - Mix giữa hợp đồng 2 năm và không xác định thời hạn
      if (userId % 2 === 0) {
        contractTypeId = 4; // Không xác định thời hạn
        startDate = new Date(2023, Math.floor(Math.random() * 12), 1);
        endDate = null;
        activeDay = startDate;
      } else {
        contractTypeId = 3; // 2 năm
        startDate = new Date(2024, Math.floor(Math.random() * 6), 1);
        endDate = addMonths(startDate, 24);
        activeDay = startDate;
      }
    } else if (userId >= 21 && userId <= 26) {
      // Phòng Nhân sự - Hợp đồng không xác định thời hạn
      contractTypeId = 4;
      startDate = new Date(2023, Math.floor(Math.random() * 18), 1);
      endDate = null;
      activeDay = startDate;
    } else if (userId >= 27 && userId <= 34) {
      // Phòng Kế toán - Hợp đồng 1 năm và 2 năm
      if (userId % 2 === 0) {
        contractTypeId = 2; // 1 năm
        startDate = new Date(2024, Math.floor(Math.random() * 6), 1);
        endDate = addMonths(startDate, 12);
        activeDay = startDate;
      } else {
        contractTypeId = 3; // 2 năm
        startDate = new Date(2023, Math.floor(Math.random() * 12), 1);
        endDate = addMonths(startDate, 24);
        activeDay = startDate;
      }
    } else if (userId >= 35 && userId <= 42) {
      // Phòng Marketing - Mix tất cả loại hợp đồng
      if (userId % 3 === 0) {
        contractTypeId = 1; // Thử việc
        startDate = new Date(2025, 9, 1); // Tháng 10/2025
        endDate = addMonths(startDate, 2);
        activeDay = startDate;
      } else if (userId % 3 === 1) {
        contractTypeId = 2; // 1 năm
        startDate = new Date(2024, Math.floor(Math.random() * 10), 1);
        endDate = addMonths(startDate, 12);
        activeDay = startDate;
      } else {
        contractTypeId = 3; // 2 năm
        startDate = new Date(2023, Math.floor(Math.random() * 12), 1);
        endDate = addMonths(startDate, 24);
        activeDay = startDate;
      }
    } else {
      // Phòng Hành chính và Giám đốc - Hợp đồng không xác định thời hạn
      contractTypeId = 4;
      startDate = new Date(2022, Math.floor(Math.random() * 24), 1);
      endDate = null;
      activeDay = startDate;
    }

    contracts.push({
      contractTypeId: contractTypeId,
      userId: userId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate ? endDate.toISOString().split('T')[0] : null,
      activeDay: activeDay.toISOString().split('T')[0],
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Insert dữ liệu
  await knex('contracts').insert(contracts);
  
  // Reset sequence
  await knex.raw("SELECT setval('contracts_id_seq', (SELECT MAX(id) FROM contracts))");
  
  console.log(`✅ Đã tạo hợp đồng cho ${contracts.length} nhân viên`);
  console.log(`   - Thử việc: ${contracts.filter(c => c.contractTypeId === 1).length} người`);
  console.log(`   - Hợp đồng 1 năm: ${contracts.filter(c => c.contractTypeId === 2).length} người`);
  console.log(`   - Hợp đồng 2 năm: ${contracts.filter(c => c.contractTypeId === 3).length} người`);
  console.log(`   - Không xác định thời hạn: ${contracts.filter(c => c.contractTypeId === 4).length} người`);
};
