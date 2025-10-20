import SettingsService from './SettingsService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import axios from 'axios';
import os from 'os';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

// Helper function to get local IP address
function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const API_GATEWAY_URL = `http://${getLocalIpAddress()}:${process.env['API_GATEWAY_PORT'] || 4000}`;

interface WorkingHours {
  start: string;
  end: string;
}

interface LunchBreak {
  start: string;
  end: string;
}

interface PenaltyConfig {
  rate: number;
}

interface UserSalaryInfo {
  baseSalary: number;
  allowance?: number;
}

interface AttendanceCalculation {
  workHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  otMinutes: number;
  otSalary: number;
  isLate: boolean;
  isEarlyLeave: boolean;
  penaltyRate: number;
  latePenaltyAmount: number;
  earlyLeavePenaltyAmount: number;
}

export class AttendanceCalculationService {
  
  // Lấy thông tin lương của user từ auth-service qua API Gateway
  private static async getUserSalaryInfo(userId: number, token?: string): Promise<UserSalaryInfo | null> {
    try {
      console.log(`🔍 Getting salary info for user ${userId}...`);
      
      // Thử với token trước nếu có
      if (token) {
        const headers: any = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        try {
          // Gọi API lấy thông tin user qua gateway
          console.log(`🔄 Calling API Gateway with token: ${API_GATEWAY_URL}/api/auth/users/detail/${userId}`);
          const response = await axios.get(`${API_GATEWAY_URL}/api/auth/users/detail/${userId}`, { headers });
          
          console.log('📥 Gateway response status:', response.status);
          console.log('📥 Gateway response data:', response.data);
          
          if (response.data && (response.data.salary !== undefined || response.data.baseSalary !== undefined)) {
            const salaryInfo: UserSalaryInfo = {
              baseSalary: response.data.salary || response.data.baseSalary || 0,
              allowance: response.data.allowance || 0
            };
            console.log('💰 Salary info retrieved via Gateway with token:', salaryInfo);
            return salaryInfo;
          } else {
            console.log('⚠️ Gateway response does not contain salary info, trying direct auth service...');
          }
        } catch (tokenError: any) {
          console.log('⚠️ Failed to get salary via Gateway with token:', tokenError.response?.status, tokenError.message);
          console.log('🔄 Trying direct auth service call...');
        }
      }

      // Fallback: Gọi trực tiếp auth service với token nếu có
      try {
        console.log(`🔄 Trying direct auth service call for user ${userId}:`);
        
        const headers: any = {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true'
        };
        
        // Thử với token nếu có
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Try new internal salary endpoint first (no token required)
        const salaryEndpoint = `http://localhost:4001/api/internal/users/${userId}/salary`;
        console.log(`🔍 Trying internal salary endpoint: ${salaryEndpoint}`);
        
        try {
          const salaryResponse = await axios.get(salaryEndpoint, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          console.log('📥 Internal salary response status:', salaryResponse.status);
          console.log('📥 Internal salary response data:', salaryResponse.data);
          
          if (salaryResponse.data && salaryResponse.data.success && salaryResponse.data.data) {
            const salaryData = salaryResponse.data.data;
            const salaryInfo: UserSalaryInfo = {
              baseSalary: salaryData.salary || salaryData.baseSalary || 0,
              allowance: salaryData.allowance || 0
            };
            console.log('✅ Salary info retrieved from internal endpoint:', salaryInfo);
            return salaryInfo;
          }
        } catch (salaryError: any) {
          console.log('⚠️ Internal salary endpoint failed:', salaryError.response?.status, salaryError.message);
        }
        
        // Fallback to old endpoint with token
        const endpoint = `http://localhost:4001/api/users/detail/${userId}`;
        console.log(`🔍 Trying fallback auth service endpoint: ${endpoint}`);
        console.log('📤 Headers:', headers);
        
        const response = await axios.get(endpoint, {
          headers,
          timeout: 10000
        });
        
        console.log('📥 Auth service response status:', response.status);
        console.log('📥 Auth service response data keys:', Object.keys(response.data));
        
        if (response.data && (response.data.salary !== undefined || response.data.baseSalary !== undefined)) {
          const salaryInfo: UserSalaryInfo = {
            baseSalary: response.data.salary || response.data.baseSalary || 0,
            allowance: response.data.allowance || 0
          };
          console.log(`✅ Salary info retrieved from internal auth service:`, salaryInfo);
          return salaryInfo;
        } else {
          console.error('❌ Auth service response does not contain salary information');
          console.error('Response data:', response.data);
        }
      } catch (directError: any) {
        console.error('❌ Internal auth service call failed:', {
          status: directError.response?.status,
          message: directError.message,
          data: directError.response?.data
        });
      }
      
      console.log('⚠️ No salary info found - this might be because:');
      console.log('  - Token expired or invalid');
      console.log('  - User does not exist in auth service');
      console.log('  - User has no salary data');
      console.log('  - Network/service connection issues');
      
      // NOTE: Salary info retrieval failed - this could be due to:
      // - User does not exist in database
      // - User has no salary data configured
      // - Network connectivity issues between services
      
      console.log('  - Will set penalty to 0 and continue attendance recording');
      return null;
    } catch (error) {
      console.error('❌ Error getting user salary info:', error);
      console.log('⚠️ Will set penalty to 0 and continue attendance recording');
      return null;
    }
  }

  // Tính toán tiền phạt dựa trên lương thực tế
  private static calculatePenaltyAmount(
    minutes: number, 
    salaryInfo: UserSalaryInfo | null, 
    penaltyRatePercent: number
  ): number {
    if (!salaryInfo || !salaryInfo.baseSalary || minutes <= 0) {
      return 0;
    }

    // New formula requested:
    // Penalty amount = baseMonthlySalary * rate * minutes
    // where `rate` is taken from settings and is a fraction per minute (e.g. 0.0001)
    const baseSalary = parseFloat(salaryInfo.baseSalary.toString());
    const penaltyAmount = baseSalary * penaltyRatePercent * minutes;

    console.log(`💸 Penalty calculation for ${minutes} minutes:`);
    console.log(`- Base monthly salary: ${baseSalary.toLocaleString('vi-VN')} VND`);
    console.log(`- Penalty rate (fraction per minute): ${penaltyRatePercent}`);
    console.log(`- Minutes: ${minutes}`);
    console.log(`- Formula: baseSalary * rate * minutes = ${baseSalary} * ${penaltyRatePercent} * ${minutes}`);
    console.log(`- Penalty amount: ${penaltyAmount.toLocaleString('vi-VN')} VND`);

    return Math.round(penaltyAmount * 100) / 100; // Round to 2 decimal places
  }

  private static async getSettings() {
    console.log('🔧 ATTENDANCE CALCULATION SERVICE - Getting settings...');
    try {
      // Use SettingsService to fetch individual setting values
      const [workingHoursVal, lunchBreakVal, overtimeRateVal, holidayRateVal, penaltyRateVal] = await Promise.all([
        SettingsService.getSettingValue('WorkingHours'),
        SettingsService.getSettingValue('LunchBreak'),
        SettingsService.getSettingValue('OvertimeRate'),
        SettingsService.getSettingValue('HolidayRate'),
        SettingsService.getSettingValue('PenaltyRate'),
      ]);

      const defaults = this.getDefaultSettings();

      return {
        workingHours: workingHoursVal || defaults.workingHours,
        lunchBreak: lunchBreakVal || defaults.lunchBreak,
        overtimeRate: overtimeRateVal || defaults.overtimeRate,
        holidayRate: holidayRateVal || defaults.holidayRate,
        penaltyRate: penaltyRateVal || defaults.penaltyRate
      };
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return this.getDefaultSettings();
    }
  }

  private static getDefaultSettings() {
    return {
      workingHours: { start: '08:00', end: '17:00' },
      lunchBreak: { start: '12:00', end: '13:00' },
      overtimeRate: { rate: 1.5 },
      holidayRate: { rate: 3.0 },
      penaltyRate: { rate: 0.01 } // 0.01% lương cơ bản mỗi phút (tương đương ~600 VND/phút với lương 6M)
    };
  }

  static async calculateAttendance(
    checkInTime: string | null,
    checkOutTime: string | null,
    date: string,
    userId?: number,
    token?: string,
    approvedOtEndTime?: string | null
  ): Promise<AttendanceCalculation> {
    console.log('🧮 Starting attendance calculation for:', { date, checkInTime, checkOutTime, userId, approvedOtEndTime });
    
    const settings = await this.getSettings();
    const workingHours = settings.workingHours as WorkingHours;
    const lunchBreak = settings.lunchBreak as LunchBreak;
    const penaltyRate = (settings.penaltyRate as PenaltyConfig).rate;

    // Lấy thông tin lương của user nếu có userId
    let salaryInfo: UserSalaryInfo | null = null;
    if (userId) {
      salaryInfo = await this.getUserSalaryInfo(userId, token);
    }

    console.log('⚙️ Using settings:', { workingHours, lunchBreak, penaltyRate });
    console.log('💰 User salary info:', salaryInfo);

    // Nếu không có check-in thì return default
    if (!checkInTime) {
      console.log('❌ No check-in time provided');
      return {
        workHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        otMinutes: 0,
        otSalary: 0,
        isLate: false,
        isEarlyLeave: false,
        penaltyRate,
        latePenaltyAmount: 0,
        earlyLeavePenaltyAmount: 0
      };
    }

    // Convert all times to Vietnam timezone (UTC+7) for consistent calculation
    const checkIn = dayjs(checkInTime).tz('Asia/Ho_Chi_Minh');
    const expectedCheckIn = dayjs(`${date} ${workingHours.start}`).tz('Asia/Ho_Chi_Minh');
    const expectedCheckOut = dayjs(`${date} ${workingHours.end}`).tz('Asia/Ho_Chi_Minh');

    console.log('🕐 Time comparison (Vietnam timezone):');
    console.log('- Check-in raw input:', checkInTime);
    console.log('- Check-in in UTC:', dayjs(checkInTime).utc().format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Check-in in Vietnam:', checkIn.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Expected check-in:', expectedCheckIn.format('YYYY-MM-DD HH:mm:ss'));
    console.log('- Expected check-out:', expectedCheckOut.format('YYYY-MM-DD HH:mm:ss'));

    // Tính late minutes - chỉ tính nếu check-in muộn hơn giờ quy định
    const lateMinutes = checkIn.isAfter(expectedCheckIn) 
      ? checkIn.diff(expectedCheckIn, 'minute') 
      : 0;

    console.log('⏰ Late calculation:');
    console.log('- checkIn.isAfter(expectedCheckIn):', checkIn.isAfter(expectedCheckIn));
    console.log('- Diff in minutes:', checkIn.diff(expectedCheckIn, 'minute'));
    console.log('- Final lateMinutes:', lateMinutes);

    let result: AttendanceCalculation = {
      workHours: 0,
      lateMinutes,
      earlyDepartureMinutes: 0,
      otMinutes: 0,
      otSalary: 0,
      isLate: lateMinutes > 0,
      isEarlyLeave: false,
      penaltyRate,
      latePenaltyAmount: 0,
      earlyLeavePenaltyAmount: 0
    };

    // Tính toán tiền phạt đi muộn ngay cả khi chưa có check-out
    if (salaryInfo && lateMinutes > 0) {
      result.latePenaltyAmount = this.calculatePenaltyAmount(
        lateMinutes, 
        salaryInfo, 
        penaltyRate
      );
      console.log('💰 Late penalty calculated (at check-in):', result.latePenaltyAmount);
    }

    // Nếu có check-out thì tính toán chi tiết
    if (checkOutTime) {
      const checkOut = dayjs(checkOutTime).tz('Asia/Ho_Chi_Minh');
      console.log('- Actual check-out:', checkOut.format('YYYY-MM-DD HH:mm:ss'));
      
      // Tính early departure minutes - chỉ tính nếu check-out sớm hơn giờ quy định
      const earlyDepartureMinutes = checkOut.isBefore(expectedCheckOut)
        ? expectedCheckOut.diff(checkOut, 'minute')
        : 0;

      result.earlyDepartureMinutes = earlyDepartureMinutes;
      result.isEarlyLeave = earlyDepartureMinutes > 0;

      console.log('🏃 Early departure calculation:', { earlyDepartureMinutes });

      // Tính tổng giờ làm việc (trừ lunch break)
      const totalMinutes = checkOut.diff(checkIn, 'minute');
      const lunchBreakMinutes = this.calculateLunchBreakTime(
        checkIn, 
        checkOut, 
        lunchBreak, 
        date
      );
      
      const workMinutes = Math.max(0, totalMinutes - lunchBreakMinutes);
      result.workHours = Math.round((workMinutes / 60) * 100) / 100; // Round to 2 decimal places

      console.log('💼 Work hours calculation:');
      console.log('- Total minutes:', totalMinutes);
      console.log('- Lunch break minutes:', lunchBreakMinutes);
      console.log('- Actual work minutes:', workMinutes);
      console.log('- Work hours:', result.workHours);

      // Tính overtime nếu có đơn OT đã duyệt
      if (approvedOtEndTime && checkOut.isAfter(expectedCheckOut)) {
        const approvedOtEnd = dayjs(approvedOtEndTime).tz('Asia/Ho_Chi_Minh');
        
        // Chỉ tính OT nếu checkout sau giờ làm việc và trước/bằng giờ OT đã duyệt
        if (checkOut.isAfter(expectedCheckOut) && checkOut.isSameOrBefore(approvedOtEnd)) {
          result.otMinutes = checkOut.diff(expectedCheckOut, 'minute');
          
          // Tính lương OT nếu có thông tin lương
          if (salaryInfo) {
            // Derive per-minute OT rate from settings.overtimeRate
            let perMinuteOtRate = 0;
            try {
              const otSetting = settings.overtimeRate as any;
              if (otSetting && typeof otSetting === 'object') {
                // If explicit perMinute provided
                if (otSetting.perMinute) {
                  perMinuteOtRate = parseFloat(otSetting.perMinute);
                } else if (otSetting.rate) {
                  // If rate is multiplier (e.g. 1.5), convert to per-minute fraction:
                  // multiplier / (working days in month * hours per day * 60)
                  const days = otSetting.workingDaysPerMonth || 22;
                  const hours = otSetting.hoursPerDay || 8;
                  perMinuteOtRate = parseFloat(otSetting.rate) / (days * hours * 60);
                }
              } else if (typeof otSetting === 'number') {
                // interpret as multiplier
                perMinuteOtRate = (otSetting as number) / (22 * 8 * 60);
              }
            } catch (e) {
              console.log('⚠️ Error parsing overtimeRate setting, falling back to default per-minute rate');
            }

            // Fallback default per-minute OT rate for multiplier 1.5
            if (!perMinuteOtRate || isNaN(perMinuteOtRate) || perMinuteOtRate <= 0) {
              perMinuteOtRate = 1.5 / (22 * 8 * 60);
            }

            // ⭐ OT salary = baseMonthlySalary * perMinuteOtRate * otMinutes
            result.otSalary = Math.round(salaryInfo.baseSalary * perMinuteOtRate * result.otMinutes);
          }
          
          console.log('⏰ Overtime calculation:');
          console.log('- OT end time (approved):', approvedOtEnd.format('HH:mm'));
          console.log('- Actual checkout:', checkOut.format('HH:mm'));
          console.log('- OT minutes:', result.otMinutes);
          console.log('- OT hours:', (result.otMinutes / 60).toFixed(2));
          console.log('- OT salary:', result.otSalary);
        } else {
          result.otMinutes = 0;
          result.otSalary = 0;
          console.log('⚠️ Checkout time exceeds approved OT time - no OT calculated');
        }
      } else {
        result.otMinutes = 0;
        result.otSalary = 0;
        console.log('ℹ️ No approved OT or checkout before expected time - no OT calculated');
      }
    }

    // Tính toán tiền phạt dựa trên lương thực tế
    if (salaryInfo) {
      // Nếu chưa tính late penalty (chưa có check-in trước đó), tính bây giờ
      if (result.latePenaltyAmount === 0 && result.lateMinutes > 0) {
        result.latePenaltyAmount = this.calculatePenaltyAmount(
          result.lateMinutes, 
          salaryInfo, 
          penaltyRate
        );
      }
      
      // Tính early leave penalty (chỉ khi có check-out)
      if (checkOutTime && result.earlyDepartureMinutes > 0) {
        result.earlyLeavePenaltyAmount = this.calculatePenaltyAmount(
          result.earlyDepartureMinutes, 
          salaryInfo, 
          penaltyRate
        );
      }
      
      console.log('💰 Penalty amounts calculated:');
      console.log('- Late penalty:', result.latePenaltyAmount);
      console.log('- Early leave penalty:', result.earlyLeavePenaltyAmount);
    } else {
      console.warn('⚠️ WARNING: Cannot get salary info - penalty will be set to 0');
      console.warn('- User ID:', userId);
      console.warn('- Token available:', !!token);
      console.warn('- Late minutes:', result.lateMinutes);
      console.warn('- Early departure minutes:', result.earlyDepartureMinutes);
      console.warn('- Penalty rate:', penaltyRate);
      console.warn('- Attendance will be saved but penalty amounts will be 0');
      
      // Không tính penalty nếu không có thông tin lương
      result.latePenaltyAmount = 0;
      result.earlyLeavePenaltyAmount = 0;
      
      console.log('💰 Penalty amounts set to 0 due to missing salary info');
    }

    console.log('✅ Final calculation result:', result);
    return result;
  }

  private static calculateLunchBreakTime(
    checkIn: dayjs.Dayjs,
    checkOut: dayjs.Dayjs,
    lunchBreak: LunchBreak,
    date: string
  ): number {
    const lunchStart = dayjs(`${date} ${lunchBreak.start}`).tz('Asia/Ho_Chi_Minh');
    const lunchEnd = dayjs(`${date} ${lunchBreak.end}`).tz('Asia/Ho_Chi_Minh');

    console.log('🍽️ Lunch break calculation:');
    console.log('- Lunch break period:', `${lunchStart.format('HH:mm')} - ${lunchEnd.format('HH:mm')}`);
    console.log('- Work period:', `${checkIn.format('HH:mm')} - ${checkOut.format('HH:mm')}`);

    // Nếu không có overlap với lunch break thì return 0
    if (checkOut.isBefore(lunchStart) || checkIn.isAfter(lunchEnd)) {
      console.log('- No overlap with lunch break');
      return 0;
    }

    // Tính overlap time
    const overlapStart = checkIn.isAfter(lunchStart) ? checkIn : lunchStart;
    const overlapEnd = checkOut.isBefore(lunchEnd) ? checkOut : lunchEnd;
    
    const overlapMinutes = Math.max(0, overlapEnd.diff(overlapStart, 'minute'));
    console.log(`- Lunch break overlap: ${overlapMinutes} minutes`);
    
    return overlapMinutes;
  }

  // Helper method để format time cho logging
  static formatTimeForLog(time: string | null): string {
    if (!time) return 'N/A';
    return dayjs(time).format('HH:mm:ss');
  }

  // Helper method để validate working hours format
  static validateWorkingHours(workingHours: WorkingHours): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(workingHours.start) && timeRegex.test(workingHours.end);
  }

  /**
   * Tính lương tăng ca dựa trên số giờ và lương cơ bản của nhân viên
   * @param userId ID của nhân viên
   * @param overtimeHours Số giờ tăng ca
   * @returns Lương tăng ca
   */
  static async calculateOvertimeSalary(userId: number, overtimeHours: number): Promise<number> {
    try {
      console.log(`💰 Calculating overtime salary for user ${userId}, hours: ${overtimeHours}`);

      // Lấy thông tin lương của nhân viên từ Employee Service
      const employeeResponse = await axios.get(
        `${API_GATEWAY_URL}/api/employee/users/${userId}/salary`,
        {
          timeout: 10000
        }
      );

      const salaryInfo: UserSalaryInfo = employeeResponse.data.data;
      console.log('👤 Employee salary info:', salaryInfo);

      if (!salaryInfo || !salaryInfo.baseSalary) {
        console.log('⚠️ No salary info found, using default calculation');
        return 0;
      }

      // Lấy cấu hình tỷ lệ lương tăng ca từ bảng settings
      let overtimeRate = 1.5; // Mặc định 150% lương cơ bản
      try {
        const overtimeRateSetting = await SettingsService.getSettingValue('OvertimeRate');
        if (overtimeRateSetting) {
          const value = overtimeRateSetting;
          if (typeof value === 'object' && value !== null) {
            const valueObj = value as any;
            overtimeRate = parseFloat(valueObj.rate || valueObj.value || 1.5);
          } else if (typeof value === 'string') {
            try {
              const parsedValue = JSON.parse(value);
              overtimeRate = parseFloat(parsedValue.rate || parsedValue.value || parsedValue || 1.5);
            } catch {
              overtimeRate = parseFloat(value);
            }
          } else if (typeof value === 'number') {
            overtimeRate = value;
          }
          console.log(`✅ Loaded overtime rate from settings: ${overtimeRate}`);
        } else {
          console.log('⚠️ OvertimeRate setting not found, using default: 1.5');
        }
      } catch (error) {
        console.log('⚠️ Error loading overtime rate from settings, using default: 1.5', error);
      }

      // Tính lương theo giờ = (lương cơ bản + phụ cấp) / (22 ngày * 8 giờ)
      const totalMonthlySalary = salaryInfo.baseSalary + (salaryInfo.allowance || 0);
      const hourlyRate = totalMonthlySalary / (22 * 8); // 22 ngày làm việc, 8 giờ/ngày
      
      // Lương tăng ca: use base monthly salary * per-minute OT rate * minutes
      // Convert overtimeHours to minutes
      const overtimeMinutes = Math.round(overtimeHours * 60);

      // derive per-minute OT rate (same logic as above)
      let perMinuteOtRate = 0;
      try {
        const overtimeRateSetting2 = await SettingsService.getSettingValue('OvertimeRate');
        if (overtimeRateSetting2) {
          let otSetting: any = overtimeRateSetting2;
          if (typeof otSetting === 'string') {
            try { otSetting = JSON.parse(otSetting); } catch {};
          }

          if (otSetting && typeof otSetting === 'object') {
            if (otSetting.perMinute) perMinuteOtRate = parseFloat(otSetting.perMinute);
            else if (otSetting.rate) {
              const days = otSetting.workingDaysPerMonth || 22;
              const hours = otSetting.hoursPerDay || 8;
              perMinuteOtRate = parseFloat(otSetting.rate) / (days * hours * 60);
            }
          } else if (typeof otSetting === 'number') {
            perMinuteOtRate = otSetting / (22 * 8 * 60);
          }
        }
      } catch (e) {
        console.log('⚠️ Error reading OvertimeRate setting for calculateOvertimeSalary, using default');
      }

      if (!perMinuteOtRate || isNaN(perMinuteOtRate) || perMinuteOtRate <= 0) {
        perMinuteOtRate = 1.5 / (22 * 8 * 60);
      }

      const overtimeSalary = Math.round(salaryInfo.baseSalary * perMinuteOtRate * overtimeMinutes);

      console.log(`💰 Overtime salary calculation:`, {
        baseSalary: salaryInfo.baseSalary,
        allowance: salaryInfo.allowance || 0,
        totalMonthlySalary,
        hourlyRate: hourlyRate.toFixed(2),
        overtimeRate,
        overtimeHours,
        overtimeSalary: overtimeSalary.toFixed(2)
      });

  return overtimeSalary;

    } catch (error) {
      console.error('❌ Error calculating overtime salary:', error);
      // Trả về 0 nếu có lỗi, không throw để không ảnh hưởng đến việc duyệt đơn
      return 0;
    }
  }
}

// Provide a default export for compatibility with different import styles
export default AttendanceCalculationService;
