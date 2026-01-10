/**
 * Dashboard Controller - Attendance Stats
 * Provides attendance statistics for dashboard
 */
import { Request, Response } from 'express';
import knex from '../lib/Databases/Connection';

// Helper to extract user ID from header
const getUserId = (req: Request): number | undefined => {
  const userDataHeader = req.headers['x-user-data'] as string;
  if (!userDataHeader) return undefined;
  
  try {
    const userData = JSON.parse(Buffer.from(userDataHeader, 'base64').toString('utf-8'));
    return userData.sub || userData.user?.id || userData.id;
  } catch (error) {
    console.error('❌ Failed to decode user data:', error);
    return undefined;
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - No user ID' });
    }

    const { year, month } = req.query;

    if (!year) {
      return res.status(400).json({ success: false, message: 'Year is required' });
    }

    const yearNum = parseInt(year as string);
    const monthNum = month ? parseInt(month as string) : null;

    console.log('📊 Dashboard request:', { userId, year: yearNum, month: monthNum });

    // Build date filter - use string format for PostgreSQL
    let startDate: string;
    let endDate: string;

    if (monthNum) {
      // Specific month - format as YYYY-MM-DD
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
      endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${lastDay}`;
    } else {
      // Whole year
      startDate = `${yearNum}-01-01`;
      endDate = `${yearNum}-12-31`;
    }

    console.log('📅 Date range:', { startDate, endDate });

    // Get attendance records for the user - DB column is "userId" (camelCase)
    const attendanceRecords = await knex('time_attendances')
      .where('userId', userId)
      .whereBetween('date', [startDate, endDate])
      .select('*');

    console.log('📝 Found attendance records:', attendanceRecords.length);
    
    // Log first record to see structure
    if (attendanceRecords.length > 0) {
      console.log('📋 Sample attendance:', {
        id: attendanceRecords[0].id,
        date: attendanceRecords[0].date,
        checkInTime: attendanceRecords[0].checkInTime,
        lateMinutes: attendanceRecords[0].lateMinutes,
        earlyDepartureMinutes: attendanceRecords[0].earlyDepartureMinutes
      });
    }

    // Count late, early leave, absent - lateMinutes/earlyDepartureMinutes are JSONB
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let absentCount = 0;
    let onTimeCount = 0;

    attendanceRecords.forEach(record => {
      // Parse lateMinutes and earlyDepartureMinutes - they can be string, number, or JSONB
      let lateMinutes = 0;
      let earlyMinutes = 0;
      
      // Handle lateMinutes
      if (record.lateMinutes !== null && record.lateMinutes !== undefined) {
        if (typeof record.lateMinutes === 'string') {
          lateMinutes = parseFloat(record.lateMinutes) || 0;
        } else if (typeof record.lateMinutes === 'number') {
          lateMinutes = record.lateMinutes;
        } else if (typeof record.lateMinutes === 'object') {
          lateMinutes = parseFloat(String(record.lateMinutes)) || 0;
        }
      }
      
      // Handle earlyDepartureMinutes
      if (record.earlyDepartureMinutes !== null && record.earlyDepartureMinutes !== undefined) {
        if (typeof record.earlyDepartureMinutes === 'string') {
          earlyMinutes = parseFloat(record.earlyDepartureMinutes) || 0;
        } else if (typeof record.earlyDepartureMinutes === 'number') {
          earlyMinutes = record.earlyDepartureMinutes;
        } else if (typeof record.earlyDepartureMinutes === 'object') {
          earlyMinutes = parseFloat(String(record.earlyDepartureMinutes)) || 0;
        }
      }
      
      // Only count days with check-in (not forgot checkout days)
      const hasCheckIn = record.checkInTime || record.check_in_time;
      const hasCheckOut = record.checkOutTime || record.check_out_time;
      
      if (!hasCheckIn) return; // Skip if no check-in
      
      // Check for late (only if checked in and has late minutes)
      const isLate = hasCheckIn && lateMinutes > 0;
      // Check for early leave (only if checked out and has early minutes)
      const isEarly = hasCheckOut && earlyMinutes > 0;
      
      if (isLate) lateCount++;
      if (isEarly) earlyLeaveCount++;
      if (record.status === 'absent' || record.status === 'ABSENT') absentCount++;
      if (!isLate && !isEarly && hasCheckIn && hasCheckOut) onTimeCount++;
    });

    console.log('📊 Attendance counts:', { lateCount, earlyLeaveCount, absentCount, onTimeCount });

    // Group by date for chart data
    const dailyStats = attendanceRecords.reduce((acc: any[], record) => {
      const dateStr = new Date(record.date).toISOString().split('T')[0];
      const existing = acc.find(item => item.date === dateStr);

      // Parse lateMinutes and earlyDepartureMinutes
      let lateMinutes = 0;
      let earlyMinutes = 0;
      
      if (record.lateMinutes !== null && record.lateMinutes !== undefined) {
        if (typeof record.lateMinutes === 'string') {
          lateMinutes = parseFloat(record.lateMinutes) || 0;
        } else if (typeof record.lateMinutes === 'number') {
          lateMinutes = record.lateMinutes;
        } else if (typeof record.lateMinutes === 'object') {
          lateMinutes = parseFloat(String(record.lateMinutes)) || 0;
        }
      }
      
      if (record.earlyDepartureMinutes !== null && record.earlyDepartureMinutes !== undefined) {
        if (typeof record.earlyDepartureMinutes === 'string') {
          earlyMinutes = parseFloat(record.earlyDepartureMinutes) || 0;
        } else if (typeof record.earlyDepartureMinutes === 'number') {
          earlyMinutes = record.earlyDepartureMinutes;
        } else if (typeof record.earlyDepartureMinutes === 'object') {
          earlyMinutes = parseFloat(String(record.earlyDepartureMinutes)) || 0;
        }
      }
      
      const hasCheckIn = record.checkInTime || record.check_in_time;
      const hasCheckOut = record.checkOutTime || record.check_out_time;
      
      if (!hasCheckIn) return acc; // Skip if no check-in
      
      const isLate = hasCheckIn && lateMinutes > 0;
      const isEarly = hasCheckOut && earlyMinutes > 0;
      const isAbsent = record.status === 'absent';
      const isOnTime = !isLate && !isEarly && hasCheckIn && hasCheckOut;

      if (existing) {
        if (isLate) existing.late++;
        if (isEarly) existing.early++;
        if (isAbsent) existing.absent++;
        if (isOnTime) existing.onTime++;
      } else {
        acc.push({
          date: dateStr,
          late: isLate ? 1 : 0,
          early: isEarly ? 1 : 0,
          absent: isAbsent ? 1 : 0,
          onTime: isOnTime ? 1 : 0,
        });
      }

      return acc;
    }, []);

    return res.json({
      success: true,
      data: {
        summary: {
          totalLate: lateCount,
          totalEarlyLeave: earlyLeaveCount,
          totalAbsent: absentCount,
          totalOnTime: onTimeCount,
        },
        chartData: dailyStats.sort((a, b) => a.date.localeCompare(b.date)),
      }
    });

  } catch (error: any) {
    console.error('❌ Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
