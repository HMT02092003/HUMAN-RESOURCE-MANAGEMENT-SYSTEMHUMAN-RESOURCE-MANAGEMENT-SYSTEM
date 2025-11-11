'use client';

import React, { useEffect, useRef } from 'react';
import { Card, Col, Row, Statistic, Progress, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { ProjectStatistics } from '@/types/project';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ProjectStatisticsProps {
  statistics: any; // Task statistics from API
  charts: any; // Chart data from API
}

const ProjectStatisticsComponent: React.FC<ProjectStatisticsProps> = ({ statistics, charts }) => {
  if (!statistics || !charts) {
    return <div>Đang tải thống kê...</div>;
  }

  // Task Status Distribution Chart (3 statuses only)
  const taskStatusData = {
    labels: ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành'],
    datasets: [
      {
        label: 'Số lượng công việc',
        data: [
          statistics.by_status?.todo || 0,
          statistics.by_status?.in_progress || 0,
          statistics.by_status?.done || 0
        ],
        backgroundColor: [
          'rgba(201, 203, 207, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(201, 203, 207, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Priority Distribution Chart
  const priorityData = {
    labels: ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'],
    datasets: [
      {
        data: [
          statistics.by_priority?.low || 0,
          statistics.by_priority?.medium || 0,
          statistics.by_priority?.high || 0,
          statistics.by_priority?.urgent || 0
        ],
        backgroundColor: [
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 0, 0, 0.8)'
        ],
        borderColor: [
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 0, 0, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Timeline Chart
  const timelineData = {
    labels: charts.timeline?.map((t: any) => t.date) || [],
    datasets: [
      {
        label: 'Chưa bắt đầu',
        data: charts.timeline?.map((t: any) => t.todo) || [],
        borderColor: 'rgb(201, 203, 207)',
        backgroundColor: 'rgba(201, 203, 207, 0.5)',
        tension: 0.3
      },
      {
        label: 'Đang thực hiện',
        data: charts.timeline?.map((t: any) => t.in_progress) || [],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.3
      },
      {
        label: 'Hoàn thành',
        data: charts.timeline?.map((t: any) => t.done) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3
      }
    ]
  };

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      }
    }
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      }
    }
  };

  return (
    <div className="project-statistics">
      {/* Overview Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng công việc"
              value={statistics.total_tasks || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={statistics.by_status?.done || 0}
              suffix={`/ ${statistics.total_tasks || 0}`}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={Math.round(statistics.completion_rate || 0)} 
              size="small" 
              status="active"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đang thực hiện"
              value={statistics.by_status?.in_progress || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Chưa bắt đầu"
              value={statistics.by_status?.todo || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Time & Efficiency Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Thời gian ước tính (tổng)"
              value={statistics.hours?.total_estimated || 0}
              suffix="giờ"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Thời gian thực tế (tổng)"
              value={statistics.hours?.total_actual || 0}
              suffix="giờ"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Hoàn thành ước tính"
              value={statistics.hours?.completed_estimated || 0}
              suffix="giờ"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        {/* Task Status Distribution */}
        <Col xs={24} lg={12}>
          <Card title="Phân bố trạng thái công việc" style={{ height: 400 }}>
            <div style={{ height: 300 }}>
              <Bar data={taskStatusData} options={chartOptions} />
            </div>
          </Card>
        </Col>

        {/* Priority Distribution */}
        <Col xs={24} lg={12}>
          <Card title="Phân bố độ ưu tiên" style={{ height: 400 }}>
            <div style={{ height: 300 }}>
              <Doughnut data={priorityData} options={doughnutOptions} />
            </div>
          </Card>
        </Col>

        {/* Timeline Progress */}
        <Col xs={24} lg={24}>
          <Card title="Tiến độ theo thời gian" style={{ height: 400 }}>
            <div style={{ height: 300 }}>
              <Line data={timelineData} options={chartOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Member Details - Using by_assignee data */}
      {statistics.by_assignee && statistics.by_assignee.length > 0 && (
        <Card 
          title={
            <>
              <TeamOutlined style={{ marginRight: 8 }} />
              Chi tiết công việc theo thành viên
            </>
          } 
          style={{ marginTop: 16 }}
        >
          <Row gutter={[16, 16]}>
            {statistics.by_assignee.map((assignee: any) => (
              <Col xs={24} sm={12} md={8} key={assignee.assignee_id}>
                <Card 
                  size="small" 
                  hoverable
                  style={{ borderLeft: '3px solid #1890ff' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{assignee.assignee_name || 'Chưa có tên'}</div>
                      <Tag color="blue" style={{ margin: 0 }}>
                        ID: {assignee.assignee_id}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div><strong>Tổng công việc:</strong> {assignee.total_tasks}</div>
                    <div><strong>Chưa bắt đầu:</strong> {assignee.todo}</div>
                    <div><strong>Đang thực hiện:</strong> {assignee.in_progress}</div>
                    <div><strong>Hoàn thành:</strong> <span style={{ color: '#52c41a' }}>{assignee.done}</span></div>
                  </div>
                  {assignee.total_tasks > 0 && (
                    <Progress
                      percent={Math.round((assignee.done / assignee.total_tasks) * 100)}
                      size="small"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
};

export default ProjectStatisticsComponent;
