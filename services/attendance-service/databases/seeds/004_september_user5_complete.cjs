
exports.seed = async function(knex) {
  // 1. Xóa dữ liệu cũ
  await knex('time_attendances')
    .where('userId', 5)
    .whereBetween('date', ['2025-09-01', '2025-09-30'])
    .del();

  console.log('🗑️  Đã xóa dữ liệu chấm công tháng 9/2025 của User 5');

  // 2. Thông số và hàm tính toán
  const baseSalary = 15000000;
  const hourlyRate = baseSalary / 26 / 8; // ~72,115 VND/giờ
  const otRate = 1.5;

  // Penalty: cố định 1,500 VND mỗi phút đi trễ/về sớm
  const calculatePenalty = (minutes) => Math.round(1500 * minutes);
  const calculateOtSalary = (hours) => Math.round(hourlyRate * otRate * hours);

  /**
   * [LOGIC MỚI] Tính toán công dựa trên tổng giờ làm việc.
   * - 8 tiếng làm việc = 1 công.
   * - Công tối đa trong một ngày là 1.
   * @param {number} totalHours - Tổng số giờ làm việc thực tế trong ngày.
   * @returns {number} Số công, được làm tròn 3 chữ số thập phân.
   */
  const calculateWorkingUnit = (totalHours) => {
    const standardWorkDayHours = 8;
    if (totalHours <= 0) {
      return 0;
    }
    // Tính công: totalHours / 8, nhưng không bao giờ vượt quá 1
    const workUnit = Math.min(totalHours / standardWorkDayHours, 1);
    // Làm tròn để số đẹp hơn
    return parseFloat(workUnit.toFixed(3));
  };


  // 3. Dữ liệu chấm công thô
  const rawAttendanceData = [
    // Tuần 1
    { userId: 5, date: '2025-09-01', checkInTime: '2025-09-01 08:55:00', checkOutTime: '2025-09-01 18:05:00', dailyTotalWorkHours: 8.17, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-02', checkInTime: '2025-09-02 09:20:00', checkOutTime: '2025-09-02 18:00:00', dailyTotalWorkHours: 7.67, lateMinutes: 20, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-03', checkInTime: '2025-09-03 09:00:00', checkOutTime: '2025-09-03 18:00:00', dailyTotalWorkHours: 8, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-04', checkInTime: '2025-09-04 09:00:00', checkOutTime: '2025-09-04 17:30:00', dailyTotalWorkHours: 7.5, lateMinutes: 0, earlyDepartureMinutes: 30, otMinutes: 0 },
    { userId: 5, date: '2025-09-05', checkInTime: '2025-09-05 09:00:00', checkOutTime: null, dailyTotalWorkHours: 0, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },

    // Tuần 2
    { userId: 5, date: '2025-09-08', checkInTime: '2025-09-08 09:00:00', checkOutTime: '2025-09-08 18:00:00', dailyTotalWorkHours: 8, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-09', checkInTime: '2025-09-09 09:35:00', checkOutTime: '2025-09-09 18:00:00', dailyTotalWorkHours: 7.42, lateMinutes: 35, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-10', checkInTime: null, checkOutTime: '2025-09-10 18:00:00', dailyTotalWorkHours: 0, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-11', checkInTime: '2025-09-11 09:00:00', checkOutTime: '2025-09-11 22:00:00', dailyTotalWorkHours: 12, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 240 },
    { userId: 5, date: '2025-09-12', checkInTime: '2025-09-12 09:15:00', checkOutTime: '2025-09-12 18:00:00', dailyTotalWorkHours: 7.75, lateMinutes: 15, earlyDepartureMinutes: 0, otMinutes: 0 },

    // Tuần 3
    { userId: 5, date: '2025-09-15', checkInTime: '2025-09-15 09:00:00', checkOutTime: '2025-09-15 18:00:00', dailyTotalWorkHours: 8, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-16', checkInTime: '2025-09-16 09:00:00', checkOutTime: '2025-09-16 17:15:00', dailyTotalWorkHours: 7.25, lateMinutes: 0, earlyDepartureMinutes: 45, otMinutes: 0 },
    { userId: 5, date: '2025-09-17', checkInTime: '2025-09-17 09:50:00', checkOutTime: '2025-09-17 18:00:00', dailyTotalWorkHours: 7.17, lateMinutes: 50, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-18', checkInTime: '2025-09-18 09:00:00', checkOutTime: '2025-09-18 18:00:00', dailyTotalWorkHours: 8, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-19', checkInTime: '2025-09-19 09:00:00', checkOutTime: '2025-09-19 21:30:00', dailyTotalWorkHours: 11.5, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 210 },

    // Tuần 4
    { userId: 5, date: '2025-09-22', checkInTime: '2025-09-22 09:25:00', checkOutTime: '2025-09-22 18:00:00', dailyTotalWorkHours: 7.58, lateMinutes: 25, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-23', checkInTime: '2025-09-23 09:00:00', checkOutTime: '2025-09-23 18:00:00', dailyTotalWorkHours: 8, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-24', checkInTime: null, checkOutTime: null, dailyTotalWorkHours: 0, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-25', checkInTime: '2025-09-25 09:00:00', checkOutTime: '2025-09-25 17:00:00', dailyTotalWorkHours: 7, lateMinutes: 0, earlyDepartureMinutes: 60, otMinutes: 0 },
    { userId: 5, date: '2025-09-26', checkInTime: '2025-09-26 09:40:00', checkOutTime: '2025-09-26 18:00:00', dailyTotalWorkHours: 7.33, lateMinutes: 40, earlyDepartureMinutes: 0, otMinutes: 0 },

    // Tuần 5
    { userId: 5, date: '2025-09-29', checkInTime: '2025-09-29 09:00:00', checkOutTime: '2025-09-29 18:00:00', dailyTotalWorkHours: 8, lateMinutes: 0, earlyDepartureMinutes: 0, otMinutes: 0 },
    { userId: 5, date: '2025-09-30', checkInTime: '2025-09-30 09:10:00', checkOutTime: '2025-09-30 18:00:00', dailyTotalWorkHours: 7.83, lateMinutes: 10, earlyDepartureMinutes: 0, otMinutes: 0 },
  ];

  // 4. Xử lý dữ liệu: Tính toán các giá trị còn lại
  const processedData = rawAttendanceData.map(record => ({
    ...record,
    dailyWorkingUnit: calculateWorkingUnit(record.dailyTotalWorkHours),
    lateArrivalPenalty: calculatePenalty(record.lateMinutes),
    earlyLeavePenalty: calculatePenalty(record.earlyDepartureMinutes),
    otSalary: calculateOtSalary(record.otMinutes / 60), // Chuyển phút OT thành giờ
    created_at: new Date(),
    updated_at: new Date(),
  }));

  // 5. Thêm dữ liệu vào database
  await knex('time_attendances').insert(processedData);

  console.log('✅ Đã tạo dữ liệu chấm công tháng 9/2025 cho User 5 (LOGIC MỚI)');
  console.log(`   📊 Tổng số bản ghi: ${processedData.length} ngày`);
  console.log('   📋 Công được tính theo giờ làm thực tế (tối đa 1 công/ngày).');
};