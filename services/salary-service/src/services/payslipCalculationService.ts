import axios from 'axios';
import MonthlyPayslip from '../Model/MonthlyPayslip';
import EmployeeSalaryProfile from '../Model/EmployeeSalaryProfile';
import EmployeeSalaryProfileAllowance from '../Model/EmployeeSalaryProfileAllowance';
import SettingsService from './SettingsService';

const apiGateway = process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 4000}`;

export async function calculateAndInsertPayslipsForMonth(monthStr: string) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    throw new Error('month must be in YYYY-MM format');
  }

  const [year, month] = monthStr.split('-').map(Number);

  // Lấy dữ liệu attendance
  const resp = await axios.get(`${apiGateway}/api/attendance/monthly-attendance/by-month`, {
    params: { month: monthStr, isApproved: true, page: 0, pageSize: 10000 }
  });

  if (!resp.data || !resp.data.data) {
    return { success: false, inserted: 0, message: 'Attendance response invalid' };
  }

  const payload = resp.data.data;
  const records = Array.isArray(payload.results) ? payload.results : (Array.isArray(payload) ? payload : []);
  
  if (records.length === 0) {
    return { success: false, inserted: 0, message: 'No approved monthly attendance found for month' };
  }

  console.log('[salary-service] calculateAndInsertPayslipsForMonth:', { month: monthStr, rawRecords: records.length });

  // Lấy danh sách userId
  const userIds = [...new Set(records.map((r: any) => String(r.userId || r.user_id)))].filter(Boolean);
  if (userIds.length === 0) {
    return { success: false, inserted: 0, message: 'No users found' };
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
      skipped: records.length
    };
  }

  const newUserIds = [...new Set(newRecords.map((r: any) => String(r.userId || r.user_id)))];

  // Lấy hợp đồng đang hiệu lực cho mỗi user
  // Date to check: cuối tháng (hoặc ngày cụ thể trong tháng)
  const checkDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
  
  const activeContractsMap = new Map();
  const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:4001/api';
  
  console.log('[salary-service] Fetching active contracts for users:', newUserIds.length);
  
  // Gọi sang employee-service để lấy hợp đồng đang hiệu lực
  await Promise.all(newUserIds.map(async (userId) => {
    try {
      const contractResp = await axios.get(
        `${EMPLOYEE_SERVICE_URL}/contracts/user/${userId}/active`,
        { params: { date: checkDate } }
      );
      if (contractResp.data && contractResp.data.id) {
        activeContractsMap.set(userId, contractResp.data);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error(`[salary-service] Error fetching active contract for user ${userId}:`, err.message);
      }
    }
  }));

  // Lấy salary profiles theo contract_id
  const contractIds = [...activeContractsMap.values()].map((c: any) => c.id).filter(Boolean);
  
  if (contractIds.length === 0) {
    const usersWithoutContracts = newUserIds;
    console.warn('[salary-service] No active contracts found for users:', usersWithoutContracts);
    
    try {
      const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds: usersWithoutContracts.map(id => Number(id)) });
      const usersList = (usersResp?.data?.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : [];
      
      const missingInfo = usersWithoutContracts.map(id => {
        const found = usersList.find((u: any) => String(u.id) === String(id));
        if (found) return { id: found.id, username: found.username, fullName: `${found.firstName || ''} ${found.lastName || ''}`.trim() };
        return { id, username: null, fullName: null };
      });
      
      return {
        success: false,
        inserted: 0,
        message: 'Không tìm thấy hợp đồng đang hiệu lực cho một số người dùng',
        missingUsers: missingInfo
      };
    } catch (err) {
      return {
        success: false,
        inserted: 0,
        message: 'Không tìm thấy hợp đồng đang hiệu lực cho người dùng',
        missingUsers: usersWithoutContracts.map(id => ({ id }))
      };
    }
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
  const missingProfileUserIds = newUserIds.filter(uid => !profileMap.has(uid));
  if (missingProfileUserIds.length > 0) {
    console.warn('[salary-service] Missing salary profiles for userIds:', missingProfileUserIds);
    try {
      // Fetch user info from auth-service via API Gateway
      const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds: missingProfileUserIds.map(id => Number(id)) });
      const missingUsers = (usersResp?.data?.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : [];

      // Build readable missing info: if auth-service returned details use them, otherwise fallback to id only
      const missingInfo = missingProfileUserIds.map(id => {
        const found = missingUsers.find((u: any) => String(u.id) === String(id));
        if (found) return { id: found.id, username: found.username, fullName: `${found.firstName || ''} ${found.lastName || ''}`.trim() };
        return { id, username: null, fullName: null };
      });

      return {
        success: false,
        inserted: 0,
        message: 'Không tìm thấy thông tin lương (salary profile) cho một số người dùng',
        missingUsers: missingInfo
      };
    } catch (err) {
      console.error('[salary-service] Error fetching missing users from auth-service:', (err as any)?.message || err);
      // If we cannot fetch user info, still return ids
      return {
        success: false,
        inserted: 0,
        message: 'Không tìm thấy thông tin lương cho một số người dùng (và không thể lấy thông tin người dùng)',
        missingUsers: missingProfileUserIds.map(id => ({ id }))
      };
    }
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
  
  for (const rec of newRecords) {
    const uid = String(rec.userId || rec.user_id);
    const profile = profileMap.get(uid);
    
    if (!profile) {
      console.warn(`[salary-service] No profile found for user ${uid}, skipping allowances`);
    }
    
    const baseSalary = Number(profile?.base_salary || 0);
    // Lấy tổng allowances cho profile hiện tại
    const allowancesSum = profile && allowancesMap.has(Number(profile.id)) ? allowancesMap.get(Number(profile.id)) || 0 : 0;

    console.log(`[salary-service] user ${uid}, profile ${profile?.id}, baseSalary: ${baseSalary}, allowancesSum: ${allowancesSum}`);

    // Tính penalties - ưu tiên totalPenalty từ attendance record
    const totalScheduledDays = Number(rec.totalScheduledDays || rec.totalDays || 0);
    const unauthorizedAbsencePenaltyPerDay = totalScheduledDays > 0 ? round2(baseSalary / totalScheduledDays) : 0;
    const totalUnauthorizedAbsencePenalty = Number(rec.unauthorizedAbsenceDays || 0) * unauthorizedAbsencePenaltyPerDay;
    
    // Ưu tiên dùng các giá trị precomputed từ attendance
    const totalLatePenalty = Number(rec.totalLatePenalty || 0);
    const totalEarlyLeavePenalty = Number(rec.totalEarlyLeavePenalty || 0);
    const penaltyFromRec = Number(rec.totalPenalty || 0);
    
    // Nếu attendance đã tính totalPenalty thì dùng nó, không thì tính tổng
    const computedPenalty = round2(totalLatePenalty + totalEarlyLeavePenalty + totalUnauthorizedAbsencePenalty);
    const totalPenalty = penaltyFromRec > 0 ? round2(penaltyFromRec) : computedPenalty;

    // Tính overtime - ưu tiên giá trị từ attendance
    const totalOvertimePay = Number(rec.totalOvertimePay || rec.totalOvertimeSalary || 0);
    const overtimePay = totalOvertimePay;

    // Tính gross = lương cơ bản + phụ cấp + làm thêm giờ
    const gross = round2(baseSalary + allowancesSum + overtimePay);

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
      overtime_pay: round2(overtimePay).toFixed(2),
      gross_salary: round2(gross).toFixed(2),
      social_insurance: round2(socialInsurance).toFixed(2),
      health_insurance: round2(healthInsurance).toFixed(2),
      personal_income_tax: round2(personalIncomeTax).toFixed(2),
      penalty_total: round2(totalPenalty).toFixed(2),
      total_deductions: round2(totalDeductions).toFixed(2),
      net_salary: round2(net).toFixed(2),
      notes:  `Bảng lương cho tháng ${monthStr}`,
      status: "1"
    });
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
      const usersResp = await axios.post(`${apiGateway}/api/auth/users/bulk`, { userIds: createdUserIds });
      const users = (usersResp?.data?.data && Array.isArray(usersResp.data.data)) ? usersResp.data.data : [];
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
    data: createdRows
  };
}

export default { calculateAndInsertPayslipsForMonth };