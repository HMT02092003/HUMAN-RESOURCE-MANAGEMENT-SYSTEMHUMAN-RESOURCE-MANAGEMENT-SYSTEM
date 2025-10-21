import dayjs from 'dayjs';
import SettingModel from '@/Models/SettingsModel';

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
  const today = dayjs().format('YYYY-MM-DD');
  if (dayjs(date).isAfter(today, 'day')) return { hasLeave: false };

  for (const app of applications) {
    if (app.type === 'leave' || app.type === 'sick-leave') {
      const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
      if (appData.startDate && appData.endDate) {
        const checkDate = dayjs(date);
        const startDate = dayjs(appData.startDate);
        const endDate = dayjs(appData.endDate);
        if (checkDate.isSame(startDate, 'day') || checkDate.isSame(endDate, 'day') ||
          (checkDate.isAfter(startDate, 'day') && checkDate.isBefore(endDate, 'day'))) {
          return { hasLeave: true, leaveType: app.type, leaveInfo: appData.reason || appData.description || 'Nghỉ phép' };
        }
      }
      if (appData.date && dayjs(appData.date).isSame(dayjs(date), 'day')) {
        return { hasLeave: true, leaveType: app.type, leaveInfo: appData.reason || appData.description || 'Nghỉ phép' };
      }
      if (appData.requestedDates && Array.isArray(appData.requestedDates)) {
        for (const reqDate of appData.requestedDates) {
          if (dayjs(reqDate.date || reqDate).isSame(dayjs(date), 'day')) {
            return { hasLeave: true, leaveType: app.type, leaveInfo: appData.reason || appData.description || 'Nghỉ phép' };
          }
        }
      }
    }
  }

  return { hasLeave: false };
}

export function checkDateHasBusinessTrip(date: string, applications: ApprovedLeaveApplication[]) {
  const today = dayjs().format('YYYY-MM-DD');
  if (dayjs(date).isAfter(today, 'day')) return { hasBusinessTrip: false };

  for (const app of applications) {
    if (app.type === 'business-trip') {
      const appData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
      if (appData.startDate && appData.endDate) {
        const checkDate = dayjs(date);
        const startDate = dayjs(appData.startDate);
        const endDate = dayjs(appData.endDate);
        if ((checkDate.isSame(startDate, 'day') || checkDate.isAfter(startDate, 'day')) &&
          (checkDate.isSame(endDate, 'day') || checkDate.isBefore(endDate, 'day'))) {
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
