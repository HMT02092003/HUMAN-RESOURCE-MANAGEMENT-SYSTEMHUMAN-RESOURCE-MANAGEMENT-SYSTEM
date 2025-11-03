/**
 * Seed file: Monthly Attendances - October 2025 - 50 Employees
 * Tính toán và tạo bảng tổng hợp chấm công tháng 10/2025 cho 50 nhân viên
 */

exports.seed = async function(knex) {
  // Xóa dữ liệu cũ
  await knex('monthly_attendances')
    .where('month', '2025-10')
    .del();

  console.log('🗑️  Đã xóa bảng tổng hợp chấm công tháng 10/2025');

  // Tính số ngày làm việc trong tháng 10/2025
  let totalScheduledDays = 0;
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 9, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalScheduledDays++;
    }
  }

  console.log(`📅 Tháng 10/2025 có ${totalScheduledDays} ngày làm việc theo lịch`);

  const monthlyRecords = [];

  // Tính toán cho từng nhân viên
  for (let userId = 1; userId <= 50; userId++) {
    // Lấy tất cả chấm công của user trong tháng 10
    const attendances = await knex('time_attendances')
      .where('userId', userId)
      .whereBetween('date', ['2025-10-01', '2025-10-31'])
      .select('*');

    // Lấy thông tin đơn từ đã duyệt của user (kiểm tra table tồn tại trước)
    let approvedLeaveDays = 0;
    let businessTripDays = 0;
    if (await knex.schema.hasTable('applications')) {
      const applications = await knex('applications')
        .where('userId', userId)
        .where('status', 1) // approved only
        .whereRaw("(data->>'startDate')::date >= ?", ['2025-10-01'])
        .whereRaw("(data->>'startDate')::date <= ?", ['2025-10-31'])
        .select('*');

      // Đếm các loại đơn
      approvedLeaveDays = applications.filter(app => app.type === 'leave').length;
      businessTripDays = applications.filter(app => app.type === 'business-trip').length;
    } else {
      // Nếu bảng applications không tồn tại (microservice tách DB), bỏ qua việc tính từ đơn
      console.warn(`⚠️ Bảng applications không tồn tại trong DB này — bỏ qua tính approvedLeaveDays/businessTripDays cho userId=${userId}`);
      approvedLeaveDays = 0;
      businessTripDays = 0;
    }

    // Tính toán các metrics
    let presentDays = 0;
    let lateDays = 0;
    let earlyLeaveDays = 0;
    let totalWorkHours = 0;
    let totalOvertimeHours = 0;
    let totalLateMinutes = 0;
    let totalEarlyLeaveMinutes = 0;
    let totalLatePenalty = 0;
    let totalEarlyLeavePenalty = 0;
    let totalOvertimeSalary = 0;
    let totalWorkingUnits = 0;

    for (const att of attendances) {
      // Nếu có check in hoặc check out -> present
      if (att.checkInTime || att.checkOutTime) {
        presentDays++;
      }

      // Đếm ngày đi trễ
      if (Number(att.lateMinutes) > 0) {
        lateDays++;
        totalLateMinutes += Number(att.lateMinutes) || 0;
        totalLatePenalty += Number(att.lateArrivalPenalty) || 0;
      }

      // Đếm ngày về sớm
      if (Number(att.earlyDepartureMinutes) > 0) {
        earlyLeaveDays++;
        totalEarlyLeaveMinutes += Number(att.earlyDepartureMinutes) || 0;
        totalEarlyLeavePenalty += Number(att.earlyLeavePenalty) || 0;
      }

  // Tổng giờ làm và công
  totalWorkHours += Number(att.dailyTotalWorkHours) || 0;
  totalWorkingUnits += Number(att.dailyWorkingUnit) || 0;

  // Tổng OT (otMinutes được lưu bằng phút)
  totalOvertimeHours += (Number(att.otMinutes) || 0) / 60;
  totalOvertimeSalary += Number(att.otSalary) || 0;
    }

    // Tính absent days (vắng không phép)
    const totalRecordedDays = attendances.length;
    const totalApprovedAbsence = approvedLeaveDays + businessTripDays;
    const absentDays = totalScheduledDays - totalRecordedDays - totalApprovedAbsence;
    const unauthorizedAbsenceDays = Math.max(0, absentDays);

    // Tính phạt vắng không phép (1 ngày vắng = 1 ngày lương cơ bản)
    const baseSalary = 15000000;
    const dailySalary = baseSalary / 26;
    const totalUnauthorizedAbsencePenalty = unauthorizedAbsenceDays * dailySalary;

    // Tổng tiền phạt
    const totalPenalty = totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty;

    // Giờ làm trung bình
    const averageWorkHours = presentDays > 0 ? totalWorkHours / presentDays : 0;

    // Tạo record
    monthlyRecords.push({
      userId: userId,
      month: '2025-10',
      
      // Thống kê ngày công
      totalScheduledDays: totalScheduledDays,
      presentDays: presentDays,
      absentDays: unauthorizedAbsenceDays,
      approvedLeaveDays: approvedLeaveDays,
      unauthorizedAbsenceDays: unauthorizedAbsenceDays,
      businessTripDays: businessTripDays,
      
      // Thống kê vi phạm
      lateDays: lateDays,
      earlyLeaveDays: earlyLeaveDays,
      totalLateMinutes: Math.round(totalLateMinutes),
      totalEarlyLeaveMinutes: Math.round(totalEarlyLeaveMinutes),
      
      // Thống kê giờ làm & công
      totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
      averageWorkHours: parseFloat(averageWorkHours.toFixed(2)),
      totalWorkingUnits: parseFloat(totalWorkingUnits.toFixed(2)),
      
      // Thống kê OT
      totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
      
      // Thống kê tài chính
      totalLatePenalty: Math.round(totalLatePenalty),
      totalEarlyLeavePenalty: Math.round(totalEarlyLeavePenalty),
      totalUnauthorizedAbsencePenalty: Math.round(totalUnauthorizedAbsencePenalty),
      totalPenalty: Math.round(totalPenalty),
      totalOvertimeSalary: Math.round(totalOvertimeSalary),
      
      // Trạng thái
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
      notes: 'Tổng hợp tự động từ dữ liệu chấm công tháng 10/2025',
      
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Insert dữ liệu
  await knex('monthly_attendances').insert(monthlyRecords);

  console.log(`✅ Đã tạo bảng tổng hợp chấm công tháng 10/2025 cho 50 nhân viên`);
  
  // Thống kê tổng quan
  const avgPresent = monthlyRecords.reduce((sum, r) => sum + r.presentDays, 0) / monthlyRecords.length;
  const avgHours = monthlyRecords.reduce((sum, r) => sum + r.totalWorkHours, 0) / monthlyRecords.length;
  const totalOT = monthlyRecords.reduce((sum, r) => sum + r.totalOvertimeHours, 0);
  
  console.log(`   📊 Trung bình có mặt: ${avgPresent.toFixed(1)}/${totalScheduledDays} ngày`);
  console.log(`   📊 Trung bình giờ làm: ${avgHours.toFixed(1)} giờ`);
  console.log(`   📊 Tổng giờ OT: ${totalOT.toFixed(1)} giờ`);
};
