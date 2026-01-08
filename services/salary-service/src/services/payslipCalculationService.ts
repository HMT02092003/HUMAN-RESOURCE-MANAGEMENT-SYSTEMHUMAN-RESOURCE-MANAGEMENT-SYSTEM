import axios from 'axios';
import MonthlyPayslip from '../Model/MonthlyPayslip';
import EmployeeSalaryProfile from '../Model/EmployeeSalaryProfile';
import EmployeeSalaryProfileAllowance from '../Model/EmployeeSalaryProfileAllowance';
import SettingsService from './SettingsService';
import AttendanceService from '../integrations/AttendanceService';
import AuthService from '../integrations/AuthService';

export async function calculateAndInsertPayslipsForMonth(monthStr: string, options?: { authToken?: string }) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    throw new Error('month must be in YYYY-MM format');
  }

  const [year, month] = monthStr.split('-').map(Number);

  // Lấy dữ liệu attendance đã được duyệt (isApproved: true)
  let resp: any;
  try {
    resp = await AttendanceService.getMonthlyAttendanceByMonth(year, month, options?.authToken);
  } catch (err: any) {
    console.error('[salary-service] Failed to fetch monthly attendance:', err?.response?.status || err.message, err?.response?.data || 'no response body');
    throw new Error(`Failed to fetch monthly attendance: ${err?.response?.status || err.message}`);
  }

  // Normalize response: AttendanceService may return multiple shapes
  // Possible shapes:
  // 1) axios response: { data: { success: true, data: { results: [...], total } } }
  // 2) already-unwrapped: { results: [...], total }
  // 3) array of records
  let body: any = resp;
  if (resp && resp.data) body = resp.data;

  let payload: any;
  if (body && body.data) {
    payload = body.data; // case 1
  } else if (body && body.results) {
    payload = body; // case 2
  } else if (Array.isArray(body)) {
    payload = { results: body, total: body.length }; // case 3
  }

  if (!payload || (!Array.isArray(payload.results) && !Array.isArray(payload))) {
    console.error('[salary-service] Unexpected attendance response shape:', JSON.stringify(body).slice(0, 2000));
    return {
      success: false,
      inserted: 0,
      message: 'Không thể lấy dữ liệu chấm công',
      usersWithoutContracts: [],
      usersWithoutApprovedAttendance: []
    };
  }
  const records = Array.isArray(payload.results) ? payload.results : (Array.isArray(payload) ? payload : []);
  
  if (records.length === 0) {
    return { 
      success: false, 
      inserted: 0, 
      message: 'Không có bảng chấm công đã được duyệt cho tháng này',
      usersWithoutContracts: [],
      usersWithoutApprovedAttendance: []
    };
  }

  console.log('[salary-service] calculateAndInsertPayslipsForMonth:', { month: monthStr, rawRecords: records.length });

  // Lấy danh sách userId
  const userIds = [...new Set(records.map((r: any) => String(r.userId || r.user_id)))].filter(Boolean);
  if (userIds.length === 0) {
    return { 
      success: false, 
      inserted: 0, 
      message: 'Không tìm thấy người dùng nào trong dữ liệu chấm công',
      usersWithoutContracts: [],
      usersWithoutApprovedAttendance: []
    };
  }

  // Kiểm tra bảng lương đã tồn tại
  const existingPayslips = await MonthlyPayslip.query()
    .whereIn('user_id', userIds as any)
    .where({ year, month })
    .select('user_id');
  
  const existingUserIds = new Set(existingPayslips.map(p => String(p.user_id)));

  // Lọc ra những user chưa có bảng lương
  const newRecords = records.filter((r: any) => {
    const uid = String(r.userId || r.user_id);
    return !existingUserIds.has(uid);
  });

  if (newRecords.length === 0) {
    return { 
      success: false, 
      inserted: 0, 
      message: 'Tất cả bảng lương tháng này đã tồn tại',
      skipped: records.length,
      usersWithoutContracts: [],
      usersWithoutApprovedAttendance: []
    };
  }

  const newUserIds = [...new Set(newRecords.map((r: any) => String(r.userId || r.user_id)))];

  // Lấy hợp đồng đang hiệu lực cho mỗi user
  // Date to check: bất kỳ ngày nào trong tháng (dùng ngày 15 để an toàn)
  const checkDate = new Date(year, month - 1, 15).toISOString().split('T')[0];
  
  const activeContractsMap = new Map();
  const usersWithoutContracts: string[] = [];
  const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://127.0.0.1:4002/api';
  
  console.log('[salary-service] Fetching active contracts for users:', newUserIds.length, 'on date:', checkDate);
  
  // Gọi sang employee-service để lấy hợp đồng đang hiệu lực
  await Promise.all(newUserIds.map(async (userId) => {
      try {
      const contractAxiosCfg: any = { params: { date: checkDate } };
      if (options?.authToken) contractAxiosCfg.headers = { Authorization: `Bearer ${options.authToken}` };
      const contractUrl = `${EMPLOYEE_SERVICE_URL}/contracts/user/${userId}/active`;
      console.log('[salary-service] Requesting contract:', contractUrl, 'with params:', contractAxiosCfg.params);
      const contractResp = await axios.get(
        contractUrl,
        contractAxiosCfg
      );
      if (contractResp.data && contractResp.data.id) {
        activeContractsMap.set(userId, contractResp.data);
        console.log(`[salary-service] User ${userId} has active contract ${contractResp.data.id}`);
      } else {
        usersWithoutContracts.push(String(userId));
        console.warn(`[salary-service] User ${userId}: contract response invalid`);
      }
    } catch (err: any) {
      usersWithoutContracts.push(String(userId));
      console.warn(`[salary-service] User ${userId}: no active contract found (${err.response?.status || err.message})`);
    }
  }));

  // Lấy salary profiles theo contract_id
  const contractIds = [...activeContractsMap.values()].map((c: any) => c.id).filter(Boolean);
  
  console.log('[salary-service] Active contracts found:', contractIds.length, 'out of', newUserIds.length, 'users');
  
  // If some users do not have active contracts, collect them and fetch basic user info for the response
  let missingContractUsers: Array<{ userId: number | string; username: string; fullName: string }> = [];
  if (usersWithoutContracts.length > 0) {
    console.warn('[salary-service] Users without active contracts:', usersWithoutContracts);
    try {
      const usersList = await AuthService.getUsersByIds(usersWithoutContracts.map(id => Number(id)), options?.authToken);

      missingContractUsers = usersWithoutContracts.map(id => {
        const found = usersList.find((u: any) => String(u.id) === String(id));
        if (found) return { userId: found.id, username: found.username, fullName: found.fullName || '' };
        return { userId: id, username: `User ${id}`, fullName: '' };
      });
    } catch (err) {
      missingContractUsers = usersWithoutContracts.map(id => ({ userId: id, username: `User ${id}`, fullName: '' }));
    }
    // continue processing users who DO have active contracts (don't abort)
  }

  console.log('[salary-service] Found', contractIds.length, 'active contracts, fetching salary profiles...');

  const profiles = await EmployeeSalaryProfile.query()
    .whereIn('contract_id', contractIds)
    .whereIn('user_id', newUserIds as any);

  const profileMap = new Map();
  profiles.forEach(p => {
    const key = String(p.user_id);
    profileMap.set(key, p);
  });

  // Detect users that don't have a salary profile for their active contract
  const missingProfileUserIds = newUserIds.filter(uid => !profileMap.has(uid) && activeContractsMap.has(uid));
  let missingProfileUsers: Array<{ userId: number | string; username: string; fullName: string }> = [];
  if (missingProfileUserIds.length > 0) {
    console.warn('[salary-service] Missing salary profiles for userIds:', missingProfileUserIds);
    try {
      const missingUsers = await AuthService.getUsersByIds(missingProfileUserIds.map(id => Number(id)), options?.authToken);

      // Build readable missing info: if auth-service returned details use them, otherwise fallback to id only
      missingProfileUsers = missingProfileUserIds.map(id => {
        const found = missingUsers.find((u: any) => String(u.id) === String(id));
        if (found) return { userId: found.id, username: found.username, fullName: found.fullName || '' };
        return { userId: id, username: `User ${id}`, fullName: '' };
      });
    } catch (err) {
      console.error('[salary-service] Error fetching missing users from auth-service:', (err as any)?.message || err);
      missingProfileUsers = missingProfileUserIds.map(id => ({ userId: String(id), username: `User ${id}`, fullName: '' }));
    }
    // continue processing other users that do have profiles
  }

  // Lấy allowances từ bảng trung gian
  const profileIds = [...profileMap.values()].map(p => Number(p.id)).filter(Boolean);
  let allowanceRows: any[] = [];
  
  if (profileIds.length > 0) {
    console.log('[salary-service] fetching allowances for profileIds:', profileIds);
    allowanceRows = await EmployeeSalaryProfileAllowance.query()
      .whereIn('employee_salary_profile_id', profileIds)
      .select('employee_salary_profile_id', 'allowance_type_id');
    console.log('[salary-service] allowanceRows:', allowanceRows.length);
  }

  // Lấy default_amount từ bảng allowance_types
  const allowanceTypeIds = [...new Set(allowanceRows.map(r => Number(r.allowance_type_id)).filter(Boolean))];
  const allowanceTypeMap = new Map();
  
  if (allowanceTypeIds.length > 0) {
    console.log('[salary-service] fetching allowance types for ids:', allowanceTypeIds);
    const AllowanceType = (await import('../Model/AllowanceType')).default;
    const types = await AllowanceType.query().whereIn('id', allowanceTypeIds).select('id', 'default_amount');
    console.log('[salary-service] allowance types found:', types.length);
    types.forEach(t => {
      allowanceTypeMap.set(Number(t.id), Number(t.default_amount || 0));
      console.log(`[salary-service] allowance type ${t.id}: ${t.default_amount}`);
    });
  }

  // Tính tổng allowances cho từng profile - KEY LÀ NUMBER
  const allowancesMap = new Map<number, number>();
  allowanceRows.forEach(r => {
    const pid = Number(r.employee_salary_profile_id);
    const atid = Number(r.allowance_type_id);
    const amt = allowanceTypeMap.get(atid) || 0;
    allowancesMap.set(pid, (allowancesMap.get(pid) || 0) + amt);
    console.log(`[salary-service] profile ${pid} + allowance type ${atid} = ${amt}, total now: ${allowancesMap.get(pid)}`);
  });

  // Lấy settings
  const bhRates = await SettingsService.getSettingValue('BHRates').catch(() => null);
  const bhxh = await SettingsService.getSettingValue('BHXH').catch(() => null);
  const bhyt = await SettingsService.getSettingValue('BHYT').catch(() => null);
  const unemployment = await SettingsService.getSettingValue('UnemploymentRate').catch(() => null);
  const tncn = await SettingsService.getSettingValue('TNCN').catch(() => null);

  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Tạo dữ liệu insert
  const insertRows: any[] = [];
  
  // Only process records for users that have active contracts and a salary profile
  const processingRecords = newRecords.filter((r: any) => {
    const uid = String(r.userId || r.user_id);
    return activeContractsMap.has(uid) && profileMap.has(uid);
  });

  for (const rec of processingRecords) {
    const uid = String(rec.userId || rec.user_id);
    const profile = profileMap.get(uid);
    
    if (!profile) {
      console.warn(`[salary-service] No profile found for user ${uid}, skipping allowances`);
    }
    
    const baseSalary = Number(profile?.base_salary || 0);
    // Lấy tổng allowances cho profile hiện tại
    const allowancesSum = profile && allowancesMap.has(Number(profile.id)) ? allowancesMap.get(Number(profile.id)) || 0 : 0;

    console.log(`[salary-service] user ${uid}, profile ${profile?.id}, baseSalary: ${baseSalary}, allowancesSum: ${allowancesSum}`);

    // ✨ Tính số công chuẩn trong tháng dựa vào WorkingDays setting
    // Gọi sang attendance-service để lấy số công chuẩn
    let standardWorkingDays = 22; // Fallback default
    try {
      const workingDaysResp = await AttendanceService.calculateStandardWorkingDays(year, month, options?.authToken);
      if (workingDaysResp && workingDaysResp.standardWorkingDays) {
        standardWorkingDays = Number(workingDaysResp.standardWorkingDays);
        console.log(`✅ [salary-service] Số công chuẩn tháng ${monthStr}: ${standardWorkingDays}`);
      }
    } catch (err) {
      console.warn(`⚠️ [salary-service] Không thể lấy số công chuẩn, dùng mặc định 22:`, (err as any)?.message);
    }

    // ✨ Lấy tổng công từ attendance record
    const totalWorkingUnits = Number(rec.totalWorkingUnits || 0);
    const totalOtWorkingUnits = Number(rec.totalOtWorkingUnits || 0);
    
    console.log(`📊 [salary-service] User ${uid}: ${totalWorkingUnits.toFixed(4)} công (trong đó ${totalOtWorkingUnits.toFixed(4)} công OT)`);
    console.log(`📊 [salary-service] Số công chuẩn: ${standardWorkingDays}, Lương cơ bản: ${baseSalary.toLocaleString('vi-VN')}`);

    // ✨ Tính lương theo công
    // Lương/công = Lương cơ bản / Số công chuẩn
    const salaryPerUnit = standardWorkingDays > 0 ? round2(baseSalary / standardWorkingDays) : 0;
    const salaryFromWorkingUnits = round2(salaryPerUnit * totalWorkingUnits);
    
    console.log(`💰 [salary-service] Lương/công: ${salaryPerUnit.toLocaleString('vi-VN')} VNĐ`);
    console.log(`💰 [salary-service] Lương từ công: ${salaryFromWorkingUnits.toLocaleString('vi-VN')} VNĐ`);

    // Tính penalties - ưu tiên totalPenalty từ attendance record
    const totalScheduledDays = Number(rec.totalScheduledDays || rec.totalDays || standardWorkingDays);
    const unauthorizedAbsencePenaltyPerDay = totalScheduledDays > 0 ? round2(baseSalary / totalScheduledDays) : 0;
    const totalUnauthorizedAbsencePenalty = Number(rec.unauthorizedAbsenceDays || 0) * unauthorizedAbsencePenaltyPerDay;
    
    // Ưu tiên dùng các giá trị precomputed từ attendance
    const totalLatePenalty = Number(rec.totalLatePenalty || 0);
    const totalEarlyLeavePenalty = Number(rec.totalEarlyLeavePenalty || 0);
    const penaltyFromRec = Number(rec.totalPenalty || 0);
    
    // Nếu attendance đã tính totalPenalty thì dùng nó, không thì tính tổng
    const computedPenalty = round2(totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty);
    const totalPenalty = penaltyFromRec > 0 ? round2(penaltyFromRec) : computedPenalty;

    // ✨ Tính gross = lương từ công + phụ cấp (không cần + OT vì đã tính trong công)
    const gross = round2(salaryFromWorkingUnits + allowancesSum);

    // Tính bảo hiểm - dựa trên insurance_salary hoặc base_salary
    let socialInsurance = 0, healthInsurance = 0, unemploymentInsurance = 0;
    // Nếu insurance_salary = 0 hoặc null thì dùng baseSalary
    const insBase = Number(profile?.insurance_salary) || baseSalary;
    
    const socialRate = bhRates?.social != null ? Number(bhRates.social) : (bhxh?.rate != null ? Number(bhxh.rate) : 0);
    const healthRate = bhRates?.health != null ? Number(bhRates.health) : (bhyt?.rate != null ? Number(bhyt.rate) : 0);
    const unemploymentRate = bhRates?.unemployment != null ? Number(bhRates.unemployment) : (unemployment?.rate != null ? Number(unemployment.rate) : 0);

    socialInsurance = round2((socialRate / 100) * insBase);
    healthInsurance = round2((healthRate / 100) * insBase);
    unemploymentInsurance = round2((unemploymentRate / 100) * insBase);

    // Tính thuế TNCN - áp dụng trên lương cơ bản (theo quy định)
    const tncRate = (tncn && typeof tncn === 'object' && tncn.rate != null) ? Number(tncn.rate) : 0;
    const personalIncomeTax = round2((tncRate / 100) * baseSalary);

    // Tổng khấu trừ = 3 bảo hiểm + thuế TNCN + phạt
    const totalDeductions = round2(socialInsurance + healthInsurance + unemploymentInsurance + totalPenalty + personalIncomeTax);
    
    // Lương thực nhận = lương gộp - tổng khấu trừ
    const net = round2(gross - totalDeductions);

    insertRows.push({
      user_id: uid,
      year,
      month,
      base_salary: round2(baseSalary).toFixed(2),
      allowances: round2(allowancesSum).toFixed(2),
      // ✨ Thêm thông tin công
      total_working_units: totalWorkingUnits.toFixed(4), // Tổng công (bao gồm cả công OT)
      total_ot_working_units: totalOtWorkingUnits.toFixed(4), // Công OT
      standard_working_days: standardWorkingDays.toFixed(2), // Số công chuẩn
      salary_per_unit: salaryPerUnit.toFixed(2), // Lương/công
      salary_from_units: salaryFromWorkingUnits.toFixed(2), // Lương từ công
      overtime_pay: '0.00', // Deprecated, giữ để tương thích
      gross_salary: round2(gross).toFixed(2),
      social_insurance: round2(socialInsurance).toFixed(2),
      health_insurance: round2(healthInsurance).toFixed(2),
      personal_income_tax: round2(personalIncomeTax).toFixed(2),
      penalty_total: round2(totalPenalty).toFixed(2),
      total_deductions: round2(totalDeductions).toFixed(2),
      net_salary: round2(net).toFixed(2),
      notes:  `Bảng lương cho tháng ${monthStr}`,
      status: "1"
    });
  }

  // If no rows to insert, return summary with missing lists
  if (insertRows.length === 0) {
    return {
      success: true,
      inserted: 0,
      skipped: existingUserIds.size,
      data: [],
      usersWithoutContracts: missingContractUsers,
      usersWithoutSalaryProfile: missingProfileUsers,
      usersWithoutApprovedAttendance: []
    };
  }

  // Bulk insert
  const chunkSize = 500;
  const createdRows: any[] = [];
  const knex = MonthlyPayslip.knex();

  await knex.transaction(async (trx) => {
    for (let i = 0; i < insertRows.length; i += chunkSize) {
      const chunk = insertRows.slice(i, i + chunkSize);
      const created = await MonthlyPayslip.query(trx).insert(chunk).returning('*');
      if (created) createdRows.push(...(Array.isArray(created) ? created : [created]));
    }
  });

  // Enrich createdRows with user info from auth-service
  try {
    const createdUserIds = [...new Set(createdRows.map(r => String(r.user_id)))].map(id => Number(id));
    if (createdUserIds.length > 0) {
      const users = await AuthService.getUsersByIds(createdUserIds, options?.authToken);
      // attach user info to each created row
      createdRows.forEach(row => {
        const u = users.find((x: any) => String(x.id) === String(row.user_id));
        row.user = u || null;
      });
    }
  } catch (err) {
    console.warn('[salary-service] Failed to enrich created payslips with user info:', (err as any)?.message || err);
  }

  return {
    success: true,
    inserted: createdRows.length,
    skipped: existingUserIds.size,
    data: createdRows,
    usersWithoutContracts: missingContractUsers,
    usersWithoutSalaryProfile: missingProfileUsers,
    usersWithoutApprovedAttendance: []
  };
}

export default { calculateAndInsertPayslipsForMonth };