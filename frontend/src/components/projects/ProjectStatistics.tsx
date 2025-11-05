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
  statistics: ProjectStatistics;
}

const ProjectStatisticsComponent: React.FC<ProjectStatisticsProps> = ({ statistics }) => {
  // Task Status Distribution Chart
  const taskStatusData = {
    labels: ['Chưa bắt đầu', 'Đang thực hiện', 'Đang review', 'Hoàn thành'],
    datasets: [
      {
        label: 'Số lượng công việc',
        data: [
          statistics.todoTasks,
          statistics.inProgressTasks,
          statistics.reviewTasks,
          statistics.completedTasks
        ],
        backgroundColor: [
          'rgba(201, 203, 207, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(201, 203, 207, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
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
          statistics.tasksByPriority.low,
          statistics.tasksByPriority.medium,
          statistics.tasksByPriority.high,
          statistics.tasksByPriority.urgent
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

  // Weekly Progress Chart
  const weeklyProgressData = {
    labels: statistics.weeklyProgress.map(w => w.week),
    datasets: [
      {
        label: 'Hoàn thành',
        data: statistics.weeklyProgress.map(w => w.completed),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3
      },
      {
        label: 'Tạo mới',
        data: statistics.weeklyProgress.map(w => w.created),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.3
      }
    ]
  };

  // Member Workload Chart
  const memberWorkloadData = {
    labels: statistics.memberWorkload.map(m => m.member.name),
    datasets: [
      {
        label: 'Công việc được giao',
        data: statistics.memberWorkload.map(m => m.assignedTasks),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Công việc hoàn thành',
        data: statistics.memberWorkload.map(m => m.completedTasks),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
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
              value={statistics.totalTasks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={statistics.completedTasks}
              suffix={`/ ${statistics.totalTasks}`}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={statistics.completionRate} 
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
              value={statistics.inProgressTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Quá hạn"
              value={statistics.overdueTasks}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: statistics.overdueTasks > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Time & Efficiency Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Thời gian ước tính"
              value={statistics.totalHoursEstimated}
              suffix="giờ"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Thời gian thực tế"
              value={statistics.totalHoursActual}
              suffix="giờ"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Hiệu suất"
              value={statistics.efficiency}
              suffix="%"
              prefix={statistics.efficiency <= 100 ? <TrophyOutlined /> : <FireOutlined />}
              valueStyle={{ 
                color: statistics.efficiency <= 100 ? '#52c41a' : '#ff4d4f' 
              }}
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

        {/* Weekly Progress */}
        <Col xs={24} lg={12}>
          <Card title="Tiến độ theo tuần" style={{ height: 400 }}>
            <div style={{ height: 300 }}>
              <Line data={weeklyProgressData} options={chartOptions} />
            </div>
          </Card>
        </Col>

        {/* Member Workload */}
        <Col xs={24} lg={12}>
          <Card title="Khối lượng công việc theo thành viên" style={{ height: 400 }}>
            <div style={{ height: 300 }}>
              <Bar data={memberWorkloadData} options={chartOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Member Details */}
      <Card 
        title={
          <>
            <TeamOutlined style={{ marginRight: 8 }} />
            Chi tiết thành viên
          </>
        } 
        style={{ marginTop: 16 }}
      >
        <Row gutter={[16, 16]}>
          {statistics.memberWorkload.map((workload) => (
            <Col xs={24} sm={12} md={8} key={workload.member.id}>
              <Card 
                size="small" 
                hoverable
                style={{ borderLeft: '3px solid #1890ff' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <img 
                    src={workload.member.avatar} 
                    alt={workload.member.name}
                    style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      marginRight: 12 
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{workload.member.name}</div>
                    <Tag color="blue" style={{ margin: 0 }}>
                      {workload.member.role}
                    </Tag>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Được giao: <strong>{workload.assignedTasks}</strong></span>
                  <span>Hoàn thành: <strong style={{ color: '#52c41a' }}>
                    {workload.completedTasks}
                  </strong></span>
                </div>
                {workload.assignedTasks > 0 && (
                  <Progress
                    percent={Math.round((workload.completedTasks / workload.assignedTasks) * 100)}
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                )}
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default ProjectStatisticsComponent;
