/**
 * Helper: Tính số công chuẩn trong một tháng
 * Dựa vào WorkingDays setting và loại trừ ngày lễ
 */

import dayjs from 'dayjs';
import SettingsService from '../SettingsService';
import HolidayModel from '@/Models/HolidayModel';

/**
 * Tính số công chuẩn (số ngày làm việc) trong một tháng
 * @param month - Format: YYYY-MM
 * @returns Số công chuẩn (số ngày làm việc thực tế)
 */
export async function calculateStandardWorkingDaysInMonth(month: string): Promise<number> {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = dayjs(`${year}-${String(monthNum).padStart(2, '0')}-01`);
  const daysInMonth = startDate.daysInMonth();
  
  // Lấy cấu hình ngày làm việc trong tuần
  const workingDaysConfig = await SettingsService.getWorkingDays();
  
  // Lấy danh sách ngày lễ trong tháng
  const holidays = await HolidayModel.query()
    .where('start_date', '<=', startDate.endOf('month').format('YYYY-MM-DD'))
    .where('end_date', '>=', startDate.format('YYYY-MM-DD'));
  
  // Tạo set chứa tất cả các ngày lễ trong khoảng thời gian
  const holidaySet = new Set<string>();
  holidays.forEach(h => {
    const start = dayjs(h.start_date);
    const end = dayjs(h.end_date);
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      holidaySet.add(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
  });
  
  let workingDays = 0;
  
  // Duyệt qua từng ngày trong tháng
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = dayjs(`${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const dateStr = currentDate.format('YYYY-MM-DD');
    
    // Kiểm tra ngày lễ
    if (holidaySet.has(dateStr)) {
      continue;
    }
    
    // Kiểm tra ngày trong tuần có phải ngày làm việc không
    const dow = currentDate.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dow] || 'monday';
    
    const isWorkingDay = workingDaysConfig ? !!(workingDaysConfig as any)[dayKey] : true;
    
    if (isWorkingDay) {
      workingDays++;
    }
  }
  
  // minimal informational log
  console.log('Standard working days calculated', { month, workingDays });
  return workingDays;
}

/**
 * Kiểm tra một ngày có phải là ngày làm việc không
 * @param date - Format: YYYY-MM-DD
 * @returns true nếu là ngày làm việc
 */
export async function isWorkingDay(date: string): Promise<boolean> {
  const currentDate = dayjs(date);
  
  // Kiểm tra ngày lễ
  const holiday = await HolidayModel.query()
    .where('start_date', '<=', date)
    .where('end_date', '>=', date)
    .first();
  if (holiday) {
    return false;
  }
  
  // Kiểm tra ngày trong tuần
  const workingDaysConfig = await SettingsService.getWorkingDays();
  const dow = currentDate.day();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayNames[dow] || 'monday';
  
  return workingDaysConfig ? !!(workingDaysConfig as any)[dayKey] : true;
}

export default {
  calculateStandardWorkingDaysInMonth,
  isWorkingDay
};
