import SettingModel from '@/Models/SettingsModel';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface WorkingHours {
  start: string;
  end: string;
}

interface LunchBreak {
  start: string;
  end: string;
}

interface RateConfig {
  rate: number;
}

interface AttendanceCalculation {
  workHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  otMinutes: number;
  isLate: boolean;
  isEarlyLeave: boolean;
}

export class AttendanceCalculationService {
  private static async getSettings() {
    console.log('🔧 NEW CODE LOADED - UPDATED VERSION');
    try {
      console.log('🔍 Getting settings from database...');
      const settings = await SettingModel.query();
      console.log('📊 Raw settings from DB:', settings);
      
      // Nếu chưa có settings thì return default
      if (!settings || settings.length === 0) {
        console.log('⚠️ No settings found in database, using defaults');
        return {
          workingHours: { start: '08:00', end: '17:00' },
          lunchBreak: { start: '12:00', end: '13:00' },
          overtimeRate: { rate: 1.5 },
          holidayRate: { rate: 3.0 }
        };
      }

      const settingsMap: { [key: string]: any } = {};
      
      settings.forEach(setting => {
        // Tạm thời sử dụng default values
        console.log(`⚙️ Processing setting: ${setting.key}, value type: ${typeof setting.value}`);
        settingsMap[setting.key] = setting.key; // Placeholder
      });

      console.log('✅ Using default settings for now');
      return {
        workingHours: { start: '08:00', end: '17:00' },
        lunchBreak: { start: '12:00', end: '13:00' },
        overtimeRate: { rate: 1.5 },
        holidayRate: { rate: 3.0 }
      };
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      // Return default settings if database error
      return {
        workingHours: { start: '08:00', end: '17:00' },
        lunchBreak: { start: '12:00', end: '13:00' },
        overtimeRate: { rate: 1.5 },
        holidayRate: { rate: 3.0 }
      };
    }
  }

  static async calculateAttendance(
    checkInTime: string | null,
    checkOutTime: string | null,
    date: string
  ): Promise<AttendanceCalculation> {
    const settings = await this.getSettings();
    const workingHours = settings.workingHours as WorkingHours;
    const lunchBreak = settings.lunchBreak as LunchBreak;

    // Nếu không có check-in thì return default
    if (!checkInTime) {
      return {
        workHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        otMinutes: 0,
        isLate: false,
        isEarlyLeave: false
      };
    }

    const checkIn = dayjs(checkInTime);
    const expectedCheckIn = dayjs(`${date} ${workingHours.start}`);
    const expectedCheckOut = dayjs(`${date} ${workingHours.end}`);

    // Tính late minutes
    const lateMinutes = checkIn.isAfter(expectedCheckIn) 
      ? checkIn.diff(expectedCheckIn, 'minute') 
      : 0;

    let result: AttendanceCalculation = {
      workHours: 0,
      lateMinutes,
      earlyDepartureMinutes: 0,
      otMinutes: 0,
      isLate: lateMinutes > 0,
      isEarlyLeave: false
    };

    // Nếu có check-out thì tính toán chi tiết
    if (checkOutTime) {
      const checkOut = dayjs(checkOutTime);
      
      // Tính early departure minutes
      const earlyDepartureMinutes = checkOut.isBefore(expectedCheckOut)
        ? expectedCheckOut.diff(checkOut, 'minute')
        : 0;

      result.earlyDepartureMinutes = earlyDepartureMinutes;
      result.isEarlyLeave = earlyDepartureMinutes > 0;

      // Tính tổng giờ làm việc (trừ lunch break)
      const totalMinutes = checkOut.diff(checkIn, 'minute');
      const lunchBreakMinutes = this.calculateLunchBreakTime(
        checkIn, 
        checkOut, 
        lunchBreak, 
        date
      );
      
      const workMinutes = Math.max(0, totalMinutes - lunchBreakMinutes);
      result.workHours = workMinutes / 60;

      // Tính overtime (nếu làm quá giờ quy định)
      const standardWorkMinutes = dayjs(`${date} ${workingHours.end}`)
        .diff(dayjs(`${date} ${workingHours.start}`), 'minute') - 60; // Trừ 60 phút lunch
      
      if (workMinutes > standardWorkMinutes) {
        result.otMinutes = workMinutes - standardWorkMinutes;
      }
    }

    return result;
  }

  private static calculateLunchBreakTime(
    checkIn: dayjs.Dayjs,
    checkOut: dayjs.Dayjs,
    lunchBreak: LunchBreak,
    date: string
  ): number {
    const lunchStart = dayjs(`${date} ${lunchBreak.start}`);
    const lunchEnd = dayjs(`${date} ${lunchBreak.end}`);

    // Nếu không có overlap với lunch break thì return 0
    if (checkOut.isBefore(lunchStart) || checkIn.isAfter(lunchEnd)) {
      return 0;
    }

    // Tính overlap time
    const overlapStart = checkIn.isAfter(lunchStart) ? checkIn : lunchStart;
    const overlapEnd = checkOut.isBefore(lunchEnd) ? checkOut : lunchEnd;
    
    return Math.max(0, overlapEnd.diff(overlapStart, 'minute'));
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
}
