/**
 * Helper: Lấy shift cho một user vào một ngày cụ thể
 * - Ưu tiên: shift đã đăng ký và được duyệt
 * - Fallback: shift mặc định (ca hành chính)
 */

import { ShiftModel } from '@/Models/ShiftModel';
import { EmployeeScheduleModel } from '@/Models/EmployeeScheduleModel';
import dayjs from 'dayjs';

export interface ShiftInfo {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  working_unit: number;
  is_default: boolean;
}

/**
 * Lấy shift cho user vào ngày cụ thể
 */
export async function getShiftForUserAndDate(userId: number, date: string): Promise<ShiftInfo> {
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  
  // 1. Kiểm tra xem user có đăng ký shift nào cho ngày này không (và đã được duyệt)
  const schedule = await EmployeeScheduleModel.query()
    .where('user_id', userId)
    .where('date', dateStr)
    .where('status', 'approved')
    .first();

  if (schedule && schedule.shift_id) {
    // Lấy thông tin shift đã đăng ký
    const shift = await ShiftModel.query().findById(schedule.shift_id);
    if (shift) {
      console.log(`✅ User ${userId} đã đăng ký shift ${shift.name} (id=${shift.id}) cho ngày ${dateStr}`);
      return shift as ShiftInfo;
    }
  }

  // 2. Nếu không có, lấy shift mặc định (ca hành chính)
  const defaultShift = await ShiftModel.getDefaultShift();
  if (!defaultShift) {
    // Fallback: Nếu không tìm thấy shift mặc định, tạo một shift cứng
    console.warn(`⚠️ Không tìm thấy shift mặc định, sử dụng ca hành chính cứng`);
    return {
      id: 1,
      name: 'Ca hành chính',
      start_time: '08:00:00',
      end_time: '17:00:00',
      working_unit: 1.0,
      is_default: true
    };
  }

  console.log(`📋 User ${userId} sử dụng shift mặc định ${defaultShift.name} (id=${defaultShift.id}) cho ngày ${dateStr}`);
  return defaultShift as ShiftInfo;
}

/**
 * Tính số giờ chuẩn của một shift (trừ nghỉ trưa)
 */
export function getShiftStandardHours(shift: ShiftInfo): number {
  const start = dayjs(`2000-01-01 ${shift.start_time}`);
  const end = dayjs(`2000-01-01 ${shift.end_time}`);
  const totalMinutes = end.diff(start, 'minute');
  
  // Trừ 1 giờ nghỉ trưa nếu ca > 6 giờ
  const lunchBreakMinutes = totalMinutes > 360 ? 60 : 0;
  
  return (totalMinutes - lunchBreakMinutes) / 60;
}

export default {
  getShiftForUserAndDate,
  getShiftStandardHours
};
