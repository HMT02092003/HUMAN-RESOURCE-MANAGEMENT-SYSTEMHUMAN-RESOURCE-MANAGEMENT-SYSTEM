/**
 * Dashboard Controller - Application Stats
 * Provides application statistics for dashboard
 */
import { ApplicationModel } from '../Models/ApplicationModel.js';
import { getUserId } from '../utils/getUserData.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized - No user ID' });
    }

    const { year, month } = req.query;

    if (!year) {
      return res.status(400).json({ success: false, message: 'Year is required' });
    }

    const yearNum = parseInt(year);
    const monthNum = month ? parseInt(month) : null;

    console.log('📊 Application dashboard request:', { userId, year: yearNum, month: monthNum });

    // Build date filter - use string format
    let startDate;
    let endDate;

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

    // Get applications for the user - use created_at for date filter
    const applications = await ApplicationModel.query()
      .where('userId', userId)
      .whereBetween('created_at', [startDate, endDate])
      .select('*');

    console.log('📝 Found applications:', applications.length);
    
    // Log first record to see structure
    if (applications.length > 0) {
      console.log('📋 Sample record:', {
        id: applications[0].id,
        status: applications[0].status,
        type: applications[0].type,
        created_at: applications[0].created_at
      });
    }

    // Count by status - status is integer (0=PENDING, 1=APPROVED, 2=REJECTED)
    const totalApplications = applications.length;
    
    // Debug: log all status values
    console.log('🔍 All status values:', applications.map(app => ({ id: app.id, status: app.status, type: typeof app.status })));
    
    // Use == instead of === for type coercion
    const approvedCount = applications.filter(app => app.status == 1).length;
    const pendingCount = applications.filter(app => app.status == 0).length;
    const rejectedCount = applications.filter(app => app.status == 2).length;

    console.log('📊 Status counts:', { totalApplications, approvedCount, pendingCount, rejectedCount });

    // Group by date for chart data
    const dailyStats = applications.reduce((acc, app) => {
      const dateStr = new Date(app.created_at).toISOString().split('T')[0];
      const existing = acc.find(item => item.date === dateStr);

      if (existing) {
        if (app.status == 1) existing.approved++;
        if (app.status == 0) existing.pending++;
        if (app.status == 2) existing.rejected++;
      } else {
        acc.push({
          date: dateStr,
          approved: app.status == 1 ? 1 : 0,
          pending: app.status == 0 ? 1 : 0,
          rejected: app.status == 2 ? 1 : 0,
        });
      }

      return acc;
    }, []);

    return res.json({
      success: true,
      data: {
        summary: {
          totalApplications,
          totalApproved: approvedCount,
          totalPending: pendingCount,
          totalRejected: rejectedCount,
        },
        chartData: dailyStats.sort((a, b) => a.date.localeCompare(b.date)),
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
