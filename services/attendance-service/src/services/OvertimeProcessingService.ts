/**
 * Overtime Processing Service
 * Xử lý tính toán tăng ca khi duyệt bảng chấm công
 */

import dayjs from 'dayjs';
import axios from 'axios';
import os from 'os';
import TimeAttendanceModel from '@/Models/TimeAttendanceModel';
import SettingModel from '@/Models/SettingsModel';
import { AttendanceCalculationService } from './AttendanceCalculationService';

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

interface OvertimeApplication {
  id: number;
  userId: number;
  type: string;
  status: string;
  data: {
    overtimeDate: string;
    startTime: string;
    overtimeHours: number;
    reason?: string;
  };
}

interface WorkingDaysConfig {
  workingDays: number[]; // [1,2,3,4,5,6] = T2-T7
}

interface OvertimeCalculationResult {
  date: string;
  requestedHours: number;
  actualHours: number;
  overtimeSalary: number;
  isValid: boolean;
  reason?: string;
}

export class OvertimeProcessingService {
  /**
   * Lấy danh sách đơn tăng ca đã được duyệt trong tháng
   */
  static async getApprovedOvertimeApplications(
    userId: number, 
    month: string,
    token: string
  ): Promise<OvertimeApplication[]> {
    try {
      console.log(`📋 Fetching approved overtime applications for user ${userId} in ${month}`);
      
      const [year, monthNum] = month.split('-');
      
      // Gọi API sang application-service
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/applications/user/${userId}/approved`,
        {
          params: { year, month: monthNum },
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cookie': `token=${token}`
          },
          timeout: 10000
        }
      );

      if (!response.data || !response.data.data) {
        console.log('⚠️ No applications found');
        return [];
      }

      // Lọc chỉ lấy đơn tăng ca
      const overtimeApps = response.data.data.filter((app: any) => 
        app.type === 'overtime' && app.status === 'approved'
      );

      console.log(`✅ Found ${overtimeApps.length} approved overtime applications`);
      return overtimeApps;

    } catch (error: any) {
      console.error('❌ Error fetching overtime applications:', error.message);
      // Không throw error, return empty array để không block việc duyệt chấm công
      return [];
    }
  }

  /**
   * Lấy cấu hình ngày làm việc trong tuần từ settings
   */
  static async getWorkingDaysConfig(): Promise<WorkingDaysConfig> {
    try {
      const setting = await SettingModel.query()
        .where('key', 'WorkingDays')
        .first();

      if (setting && setting.value) {
        const value = setting.value;
        
        // Parse value
        if (typeof value === 'object' && value !== null && 'workingDays' in value) {
          return value as WorkingDaysConfig;
        } else if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (parsed.workingDays) {
              return parsed;
            }
          } catch {}
        }
      }

      // Mặc định T2-T6 (1-5)
      console.log('⚠️ Using default working days: Monday-Friday');
      return { workingDays: [1, 2, 3, 4, 5] };

    } catch (error) {
      console.error('❌ Error loading working days config:', error);
      return { workingDays: [1, 2, 3, 4, 5] };
    }
  }

  /**
   * Kiểm tra xem ngày có phải ngày làm việc không
   */
  static isWorkingDay(date: string, workingDays: number[]): boolean {
    const dayOfWeek = dayjs(date).day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    return workingDays.includes(dayOfWeek);
  }

  /**
   * Validate và tính toán tăng ca cho một ngày
   */
  static async validateAndCalculateOvertime(
    userId: number,
    overtimeApp: OvertimeApplication,
    attendanceRecord: any,
    workingDaysConfig: WorkingDaysConfig
  ): Promise<OvertimeCalculationResult> {
    const { overtimeDate, startTime, overtimeHours } = overtimeApp.data;

    console.log(`\n🔍 Processing overtime for date ${overtimeDate}:`);
    console.log(`   - Requested: ${startTime} for ${overtimeHours} hours`);

    // Kiểm tra xem có bản ghi chấm công không
    if (!attendanceRecord) {
      return {
        date: overtimeDate,
        requestedHours: overtimeHours,
        actualHours: 0,
        overtimeSalary: 0,
        isValid: false,
        reason: 'Không tìm thấy bản ghi chấm công'
      };
    }

    // Kiểm tra xem có checkout chưa
    if (!attendanceRecord.checkOutTime) {
      return {
        date: overtimeDate,
        requestedHours: overtimeHours,
        actualHours: 0,
        overtimeSalary: 0,
        isValid: false,
        reason: 'Nhân viên chưa checkout'
      };
    }

    // Kiểm tra ngày làm việc
    const isWorkDay = this.isWorkingDay(overtimeDate, workingDaysConfig.workingDays);
    console.log(`   - Is working day: ${isWorkDay}`);

    // Tính toán thời gian
    const checkOutTime = dayjs(attendanceRecord.checkOutTime);
    const requestedStartTime = dayjs(`${overtimeDate} ${startTime}`);
    const requestedEndTime = requestedStartTime.add(overtimeHours, 'hour');

    console.log(`   - Checkout time: ${checkOutTime.format('HH:mm:ss')}`);
    console.log(`   - Requested start: ${requestedStartTime.format('HH:mm:ss')}`);
    console.log(`   - Requested end: ${requestedEndTime.format('HH:mm:ss')}`);

    // Validate: checkout phải sau thời gian bắt đầu tăng ca
    if (checkOutTime.isBefore(requestedStartTime)) {
      return {
        date: overtimeDate,
        requestedHours: overtimeHours,
        actualHours: 0,
        overtimeSalary: 0,
        isValid: false,
        reason: 'Checkout trước giờ bắt đầu tăng ca'
      };
    }

    // Tính giờ tăng ca thực tế
    let actualOvertimeHours = 0;
    
    // Nếu checkout >= thời gian kết thúc đăng ký -> tính full
    if (checkOutTime.isAfter(requestedEndTime) || checkOutTime.isSame(requestedEndTime)) {
      actualOvertimeHours = overtimeHours;
      console.log(`   ✅ Full overtime hours: ${actualOvertimeHours}`);
    } else {
      // Tính theo thời gian thực tế
      const minutesDiff = checkOutTime.diff(requestedStartTime, 'minute');
      actualOvertimeHours = Math.max(0, minutesDiff / 60);
      
      // Yêu cầu tối thiểu 80% thời gian đăng ký
      const minRequiredHours = overtimeHours * 0.8;
      if (actualOvertimeHours < minRequiredHours) {
        return {
          date: overtimeDate,
          requestedHours: overtimeHours,
          actualHours: actualOvertimeHours,
          overtimeSalary: 0,
          isValid: false,
          reason: `Không đủ thời gian tăng ca (cần tối thiểu ${minRequiredHours}h, thực tế ${actualOvertimeHours.toFixed(2)}h)`
        };
      }
      
      console.log(`   ⚠️ Partial overtime hours: ${actualOvertimeHours.toFixed(2)} (${((actualOvertimeHours/overtimeHours)*100).toFixed(0)}%)`);
    }

    // Tính lương tăng ca
    const overtimeSalary = await AttendanceCalculationService.calculateOvertimeSalary(
      userId,
      actualOvertimeHours
    );

    console.log(`   💰 Overtime salary: ${overtimeSalary.toLocaleString()} VND`);

    return {
      date: overtimeDate,
      requestedHours: overtimeHours,
      actualHours: actualOvertimeHours,
      overtimeSalary,
      isValid: true
    };
  }

  /**
   * Xử lý tất cả đơn tăng ca của user trong tháng
   * Cập nhật vào bảng time_attendances
   */
  static async processAllOvertimeForMonth(
    userId: number,
    month: string,
    token: string
  ): Promise<{
    totalProcessed: number;
    totalValid: number;
    totalInvalid: number;
    totalOvertimeHours: number;
    totalOvertimeSalary: number;
    details: OvertimeCalculationResult[];
  }> {
    try {
      console.log(`\n🚀 Starting overtime processing for user ${userId} in ${month}`);

      // 1. Lấy danh sách đơn tăng ca đã duyệt
      const overtimeApps = await this.getApprovedOvertimeApplications(userId, month, token);
      
      if (overtimeApps.length === 0) {
        console.log('ℹ️ No overtime applications to process');
        return {
          totalProcessed: 0,
          totalValid: 0,
          totalInvalid: 0,
          totalOvertimeHours: 0,
          totalOvertimeSalary: 0,
          details: []
        };
      }

      // 2. Lấy cấu hình ngày làm việc
      const workingDaysConfig = await this.getWorkingDaysConfig();
      console.log(`📅 Working days config:`, workingDaysConfig.workingDays);

      // 3. Lấy tất cả bản ghi chấm công trong tháng
      const startDate = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');

      const attendanceRecords = await TimeAttendanceModel.query()
        .where('userId', userId)
        .whereBetween('date', [startDate, endDate]);

      console.log(`📊 Found ${attendanceRecords.length} attendance records`);

      // 4. Xử lý từng đơn tăng ca
      const results: OvertimeCalculationResult[] = [];
      let totalValid = 0;
      let totalInvalid = 0;
      let totalOvertimeHours = 0;
      let totalOvertimeSalary = 0;

      for (const overtimeApp of overtimeApps) {
        const { overtimeDate } = overtimeApp.data;
        
        // Tìm bản ghi chấm công tương ứng
        const attendanceRecord = attendanceRecords.find(
          record => dayjs(record.date).format('YYYY-MM-DD') === overtimeDate
        );

        // Validate và tính toán
        const result = await this.validateAndCalculateOvertime(
          userId,
          overtimeApp,
          attendanceRecord,
          workingDaysConfig
        );

        results.push(result);

        if (result.isValid) {
          totalValid++;
          totalOvertimeHours += result.actualHours;
          totalOvertimeSalary += result.overtimeSalary;

          // Cập nhật vào bảng time_attendances
          if (attendanceRecord) {
            await TimeAttendanceModel.query()
              .where('id', attendanceRecord.id)
              .patch({
                otWorkingUnit: 1, // Đánh dấu có 1 lần tăng ca
                otMinutes: Math.round(result.actualHours * 60),
                otSalary: result.overtimeSalary,
                updated_at: dayjs().toISOString()
              });

            console.log(`   ✅ Updated attendance record for ${overtimeDate}`);
          }
        } else {
          totalInvalid++;
          console.log(`   ❌ Invalid overtime: ${result.reason}`);
        }
      }

      console.log(`\n📈 Overtime processing summary:`);
      console.log(`   - Total processed: ${overtimeApps.length}`);
      console.log(`   - Valid: ${totalValid}`);
      console.log(`   - Invalid: ${totalInvalid}`);
      console.log(`   - Total hours: ${totalOvertimeHours.toFixed(2)}`);
      console.log(`   - Total salary: ${totalOvertimeSalary.toLocaleString()} VND`);

      return {
        totalProcessed: overtimeApps.length,
        totalValid,
        totalInvalid,
        totalOvertimeHours,
        totalOvertimeSalary,
        details: results
      };

    } catch (error: any) {
      console.error('❌ Error processing overtime:', error);
      throw error;
    }
  }
}
