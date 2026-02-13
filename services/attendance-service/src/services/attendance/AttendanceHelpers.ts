import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import SettingModel from '@/Models/SettingsModel';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ_VN = 'Asia/Ho_Chi_Minh';

interface WorkingDaysConfig {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface ApprovedLeaveApplication {
  id: number;
  type: string;
  userId: number;
  status: string;
  data: any;
}

/**
 * Shared helpers used across attendance services
 */
export async function getWorkingDaysConfig(): Promise<WorkingDaysConfig> {
  try {
    // Load settings from DB
    const setting = await SettingModel.query().findOne('key', 'WorkingDays');

    if (setting && setting.value) {
      const value = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      return value as WorkingDaysConfig;
    }

    return {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    };
  } catch (error) {
    console.error('⚠️ getWorkingDaysConfig error:', error);
    return {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    };
  }
}

export function isWorkingDay(date: string, config: WorkingDaysConfig): boolean {
  const dayOfWeek = dayjs(date).day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysMap: { [key: number]: keyof WorkingDaysConfig } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };
  const dayKey = daysMap[dayOfWeek];
  return dayKey ? config[dayKey] || false : false;
}

export function checkDateHasLeave(date: string, applications: ApprovedLeaveApplication[]) {

  // Removed date check to allow calculating past leave days correctly

  for (const app of applications) {
    if (app.type === 'leave' || app.type === 'sick-leave' || app.type === 'paid_leave' || app.type === 'unpaid_leave') {
      const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;

      // Determine if paid or unpaid
      // Default rule: 'leave' is usually annual (paid). 'sick-leave' is paid. 
      // 'unpaid_leave' is unpaid. 
      // check appData.isPaid if exists
      let isPaid = true;

      // Aggressive Unpaid Checks
      if (app.type === 'unpaid_leave') isPaid = false;
      if (app.type?.includes('unpaid')) isPaid = false; // Check for any type containing unpaid

      if (appData.leaveType === 'unpaid') isPaid = false;
      if (appData.isPaid === false) isPaid = false;
      if (appData.isPaidLeave === false) isPaid = false;

      // Check reason text for keywords
      const reasonText = (appData.reason || appData.description || '').toLowerCase();
      if (reasonText.includes('không lương') || reasonText.includes('unpaid')) {
        isPaid = false;
      }

      // map applicationCategory 'regular' to Unpaid (consistent with frontend LeaveTypeConfig)
      if (appData.applicationCategory === 'regular') isPaid = false;

      const leaveInfo = appData.reason || appData.description || (isPaid ? 'Nghỉ có lương' : 'Nghỉ không lương');

      if (appData.startDate && appData.endDate) {
        // Chuyển date từ UTC sang local VN để so sánh ngày chính xác
        const checkDate = dayjs(date).tz(TZ_VN).startOf('day');
        const startDate = dayjs(appData.startDate).tz(TZ_VN).startOf('day');
        const endDate = dayjs(appData.endDate).tz(TZ_VN).startOf('day');

        if ((checkDate.isSame(startDate) || checkDate.isAfter(startDate)) &&
          (checkDate.isSame(endDate) || checkDate.isBefore(endDate))) {
          return { hasLeave: true, leaveType: app.type, isPaidLeave: isPaid, leaveInfo };
        }
      }
      if (appData.date && dayjs(appData.date).isSame(dayjs(date), 'day')) {
        return { hasLeave: true, leaveType: app.type, isPaidLeave: isPaid, leaveInfo };
      }
      if (appData.requestedDates && Array.isArray(appData.requestedDates)) {
        for (const reqDate of appData.requestedDates) {
          if (dayjs(reqDate.date || reqDate).isSame(dayjs(date), 'day')) {
            return { hasLeave: true, leaveType: app.type, isPaidLeave: isPaid, leaveInfo };
          }
        }
      }
    }
  }

  return { hasLeave: false, isPaidLeave: false };
}

export function checkDateHasBusinessTrip(date: string, applications: ApprovedLeaveApplication[]) {
  // const today = dayjs().format('YYYY-MM-DD');
  // if (dayjs(date).isAfter(today, 'day')) return { hasBusinessTrip: false };

  for (const app of applications) {
    if (app.type === 'business-trip' || app.type === 'business_trip') {
      const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
      if (appData.startDate && appData.endDate) {
        const checkDate = dayjs(date).tz(TZ_VN).startOf('day');
        const startDate = dayjs(appData.startDate).tz(TZ_VN).startOf('day');
        const endDate = dayjs(appData.endDate).tz(TZ_VN).startOf('day');

        if ((checkDate.isSame(startDate) || checkDate.isAfter(startDate)) &&
          (checkDate.isSame(endDate) || checkDate.isBefore(endDate))) {
          return { hasBusinessTrip: true, tripInfo: appData.reason || 'Công tác', destination: appData.destination || appData.location || 'Chưa rõ địa điểm' };
        }
      }
      if (appData.date && dayjs(appData.date).isSame(dayjs(date), 'day')) {
        return { hasBusinessTrip: true, tripInfo: appData.reason || 'Công tác', destination: appData.destination || appData.location || 'Chưa rõ địa điểm' };
      }
    }
  }

  return { hasBusinessTrip: false };
}

export async function checkDateHasHoliday(date: string) {
  try {
    const HolidayModel = (await import('@/Models/HolidayModel')).default;
    const holidays = await HolidayModel.query().whereRaw('date(start_date) <= ? AND date(end_date) >= ?', [date, date]);
    if (holidays.length > 0 && holidays[0]) {
      return { isHoliday: true, holidayName: holidays[0].name || 'Ngày Lễ', isPublic: true };
    }
  } catch (error) {
    console.error('Error checking holiday:', error);
  }
  return { isHoliday: false };
}
