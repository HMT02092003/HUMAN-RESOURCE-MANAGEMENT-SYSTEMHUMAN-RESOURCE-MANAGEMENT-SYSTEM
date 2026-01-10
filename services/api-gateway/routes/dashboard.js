/**
 * Dashboard routes - Aggregates data from multiple services
 */
import express from 'express';
import axios from 'axios';

const router = express.Router();

// Get services from env
const SERVICES = {
  attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://127.0.0.1:4003',
  application: process.env.APPLICATION_SERVICE_URL || 'http://127.0.0.1:4004',
};

// Aggregated dashboard stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year) {
      return res.status(400).json({ 
        success: false, 
        message: 'Year parameter is required' 
      });
    }

    // Forward user data header to services
    const headers = {
      'x-user-data': req.headers['x-user-data'],
    };

    // Call both services in parallel
    const [attendanceRes, applicationRes] = await Promise.all([
      axios.get(`${SERVICES.attendance}/api/dashboard/stats`, {
        params: { year, month },
        headers,
      }).catch(err => {
        console.error('❌ Attendance service error:', err.message);
        return { data: { success: false, data: null } };
      }),
      axios.get(`${SERVICES.application}/api/dashboard/stats`, {
        params: { year, month },
        headers,
      }).catch(err => {
        console.error('❌ Application service error:', err.message);
        return { data: { success: false, data: null } };
      }),
    ]);

    const attendanceData = attendanceRes.data?.data || {};
    const applicationData = applicationRes.data?.data || {};

    // Combine the data
    const combinedData = {
      attendance: {
        summary: attendanceData.summary || {
          totalLate: 0,
          totalEarlyLeave: 0,
          totalAbsent: 0,
          totalOnTime: 0,
        },
        chartData: attendanceData.chartData || [],
      },
      applications: {
        summary: applicationData.summary || {
          totalApplications: 0,
          totalApproved: 0,
          totalPending: 0,
          totalRejected: 0,
        },
        chartData: applicationData.chartData || [],
      },
    };

    return res.json({
      success: true,
      data: combinedData,
      period: month ? `${year}-${month}` : `${year}`,
    });

  } catch (error) {
    console.error('❌ Dashboard aggregation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message,
    });
  }
});

export default router;
