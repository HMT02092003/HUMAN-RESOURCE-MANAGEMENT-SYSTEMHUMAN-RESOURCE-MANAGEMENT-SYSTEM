"use client";

import { useEffect, useState } from "react";
import { DatePicker, Select, Button, Space, message } from "antd";
import { motion } from "framer-motion";
import dayjs, { Dayjs } from "dayjs";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatWidget } from "@/components/dashboard/StatWidget";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import MainLayout from '@/components/main-layout';
import api from "@/service/apiService";

const { Option } = Select;

interface DashboardStats {
  attendance: {
    summary: {
      totalLate: number;
      totalEarlyLeave: number;
      totalAbsent: number;
      totalOnTime: number;
    };
    chartData: Array<{
      date: string;
      late: number;
      early: number;
      absent: number;
      onTime: number;
    }>;
  };
  applications: {
    summary: {
      totalApplications: number;
      totalApproved: number;
      totalPending: number;
      totalRejected: number;
    };
    chartData: Array<{
      date: string;
      approved: number;
      pending: number;
      rejected: number;
    }>;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(dayjs().month() + 1);

  const fetchDashboardData = async (year: number, month: number | null) => {
    try {
      setLoading(true);
      const params: any = { year };
      if (month) {
        params.month = month;
      }

      const response = await api.get('/api/dashboard/stats', { params });
      
      if (response.data.success) {
        setData(response.data.data);
      } else {
        message.error('Không thể tải dữ liệu dashboard');
      }
    } catch (error: any) {
      console.error('❌ Dashboard fetch error:', error);
      message.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load current month data on mount
    fetchDashboardData(selectedYear, selectedMonth);
  }, []);

  const handleSearch = () => {
    fetchDashboardData(selectedYear, selectedMonth);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleMonthChange = (month: number | null) => {
    setSelectedMonth(month);
  };

  if (loading) {
    // Render the layout shell without a large skeleton to avoid the heavy loading effect
    return (
      <MainLayout pageName="Dashboard" pageDes="Tổng quan hệ thống quản lý nhân sự">
        <div className="min-h-screen bg-white p-6 font-sans" />
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout pageName="Dashboard" pageDes="Tổng quan hệ thống quản lý nhân sự">
        <div className="min-h-screen bg-white p-6 font-sans">
          <div className="text-center text-gray-500">Không có dữ liệu</div>
        </div>
      </MainLayout>
    );
  }

  // Prepare widgets data
  const widgets = [
    {
      id: 1,
      title: "Tổng đơn từ",
      value: data.applications.summary.totalApplications,
      unit: "đơn",
      trend: `${data.applications.summary.totalPending} chờ duyệt`,
      status: "info" as const,
      icon: "files"
    },
    {
      id: 2,
      title: "Đơn đã duyệt",
      value: data.applications.summary.totalApproved,
      unit: "đơn",
      trend: `${((data.applications.summary.totalApproved / (data.applications.summary.totalApplications || 1)) * 100).toFixed(1)}% tổng số`,
      status: "success" as const,
      icon: "check"
    },
    {
      id: 3,
      title: "Đơn chờ duyệt",
      value: data.applications.summary.totalPending,
      unit: "đơn",
      trend: "Cần xử lý",
      status: "warning" as const,
      icon: "clock"
    },
    {
      id: 4,
      title: "Đơn bị từ chối",
      value: data.applications.summary.totalRejected,
      unit: "đơn",
      trend: `${((data.applications.summary.totalRejected / (data.applications.summary.totalApplications || 1)) * 100).toFixed(1)}%`,
      status: "danger" as const,
      icon: "x"
    },
    {
      id: 5,
      title: "Tổng đi muộn",
      value: data.attendance.summary.totalLate,
      unit: "lần",
      trend: selectedMonth ? "Trong tháng" : "Trong năm",
      status: "warning" as const,
      icon: "clock"
    },
    {
      id: 6,
      title: "Tổng về sớm",
      value: data.attendance.summary.totalEarlyLeave,
      unit: "lần",
      trend: selectedMonth ? "Trong tháng" : "Trong năm",
      status: "warning" as const,
      icon: "clock"
    },
    {
      id: 7,
      title: "Vắng mặt",
      value: data.attendance.summary.totalAbsent,
      unit: "lần",
      trend: "Nghỉ không phép",
      status: "danger" as const,
      icon: "x"
    },
  ];

  // Prepare attendance chart data
  const attendanceChartData = data.attendance.chartData.map(item => ({
    name: dayjs(item.date).format('DD/MM'),
    onTime: item.onTime,
    late: item.late,
    early: item.early,
    absent: item.absent,
  }));

  // Prepare application chart data
  const applicationChartData = data.applications.chartData.map(item => ({
    name: dayjs(item.date).format('DD/MM'),
    approved: item.approved,
    pending: item.pending,
    rejected: item.rejected,
  }));

  return (
    <MainLayout pageName="Dashboard" pageDes="Tổng quan hệ thống quản lý nhân sự">
      <div className="min-h-screen bg-white p-6 font-sans">
        {/* Date Selector */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-md">
          <Space size="middle">
            <span className="font-semibold text-gray-700">Chọn thời gian:</span>
            <Select
              value={selectedYear}
              onChange={handleYearChange}
              style={{ width: 120 }}
              placeholder="Năm"
            >
              {Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
            <Select
              value={selectedMonth}
              onChange={handleMonthChange}
              style={{ width: 140 }}
              placeholder="Tháng (tùy chọn)"
              allowClear
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <Option key={month} value={month}>Tháng {month}</Option>
              ))}
            </Select>
            <Button type="primary" onClick={handleSearch} loading={loading}>
              Tìm kiếm
            </Button>
          </Space>
        </div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {widgets.map((widget, index) => {
            // Insert section labels between groups: applications (first 4), attendance (rest)
            const nodes: any[] = [];
            if (index === 0) {
              nodes.push(
                <div key="label-apps" className="col-span-full mb-2">
                  <h3 className="text-lg font-semibold text-gray-700">Đơn từ</h3>
                </div>
              );
            }
            if (index === 4) {
              nodes.push(
                <div key="label-attendance" className="col-span-full mb-2">
                  <h3 className="text-lg font-semibold text-gray-700">Chấm công</h3>
                </div>
              );
            }

            nodes.push(
              <StatWidget
                key={widget.id}
                title={widget.title}
                value={widget.value}
                unit={widget.unit}
                trend={widget.trend}
                status={widget.status}
                iconKey={widget.icon}
                index={index}
              />
            );

            return nodes;
          })}
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Attendance Chart */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <AnalyticsChart
              title="Thống kê chấm công"
              data={attendanceChartData}
              type="bar"
              dataKeys={['onTime', 'late', 'early', 'absent']}
              colors={['#10b981', '#f59e0b', '#fb923c', '#ef4444']}
            />
          </motion.div>

          {/* Application Chart */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AnalyticsChart
              title="Thống kê đơn từ"
              data={applicationChartData}
              type="bar"
              dataKeys={['approved', 'pending', 'rejected']}
              colors={['#10b981', '#f59e0b', '#ef4444']}
            />
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
