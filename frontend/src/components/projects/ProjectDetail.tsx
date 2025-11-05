'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Descriptions, 
  Tag, 
  Progress, 
  Avatar, 
  Timeline, 
  Spin,
  Row,
  Col,
  Button,
  Space
} from 'antd';
import {
  ProjectOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Project, ProjectStatistics, TimelineEvent } from '@/types/project';
import { projectService } from '@/service/projectService';
import ProjectStatisticsComponent from './ProjectStatistics';
import TaskBoard from './TaskBoard';
import dayjs from 'dayjs';

interface ProjectDetailProps {
  projectId: string;
}

const statusColors = {
  planning: 'blue',
  active: 'green',
  on_hold: 'orange',
  completed: 'purple',
  cancelled: 'red'
};

const statusLabels = {
  planning: 'Đang lên kế hoạch',
  active: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, statsData, timelineData] = await Promise.all([
        projectService.getProjectById(projectId),
        projectService.getProjectStatistics(projectId),
        projectService.getProjectTimeline(projectId)
      ]);
      
      setProject(projectData);
      setStatistics(statsData);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Không tìm thấy dự án
        </div>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const renderOverview = () => (
    <div>
      {/* Project Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <ProjectOutlined style={{ fontSize: 32, marginRight: 16, color: '#1890ff' }} />
              <div>
                <h2 style={{ margin: 0 }}>{project.name}</h2>
                <Tag color={statusColors[project.status]} style={{ marginTop: 8 }}>
                  {statusLabels[project.status]}
                </Tag>
              </div>
            </div>
            <p style={{ fontSize: 16, color: '#666' }}>{project.description}</p>
            <div style={{ marginTop: 16 }}>
              {project.tags.map(tag => (
                <Tag key={tag} color="blue">{tag}</Tag>
              ))}
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>
                  Tiến độ dự án
                </div>
                <Progress
                  type="circle"
                  percent={project.progress}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={(percent) => `${percent}%`}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Project Details */}
      <Card title="Thông tin chi tiết">
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Mã dự án" span={1}>
            {project.id}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái" span={1}>
            <Tag color={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Tên dự án" span={2}>
            {project.name}
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả" span={2}>
            {project.description}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày bắt đầu" span={1}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            {dayjs(project.startDate).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày kết thúc" span={1}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            {dayjs(project.endDate).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Quản lý dự án" span={2}>
            <Space>
              <Avatar src={project.manager.avatar} />
              {project.manager.name} - {project.manager.role}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Khách hàng" span={2}>
            {project.client}
          </Descriptions.Item>
          <Descriptions.Item label="Ngân sách" span={1}>
            <DollarOutlined style={{ marginRight: 8 }} />
            {formatCurrency(project.budget || 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Đã chi tiêu" span={1}>
            <DollarOutlined style={{ marginRight: 8 }} />
            {formatCurrency(project.spent || 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Tiến độ ngân sách" span={2}>
            <Progress
              percent={Math.round(((project.spent || 0) / (project.budget || 1)) * 100)}
              status={(project.spent || 0) > (project.budget || 0) ? 'exception' : 'active'}
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  const renderMembers = () => (
    <Row gutter={[16, 16]}>
      {project.members.map(member => (
        <Col xs={24} sm={12} md={8} lg={6} key={member.id}>
          <Card hoverable>
            <div style={{ textAlign: 'center' }}>
              <Avatar 
                size={64} 
                src={member.avatar}
                style={{ marginBottom: 12 }}
              />
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                {member.name}
              </div>
              <Tag color="blue">{member.role}</Tag>
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                {member.email}
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderTimeline = () => (
    <Card>
      <Timeline mode="left">
        {timeline.map(event => {
          let icon;
          let color;
          
          switch (event.type) {
            case 'milestone':
              icon = <ProjectOutlined />;
              color = 'blue';
              break;
            case 'task_created':
              color = 'green';
              break;
            case 'task_completed':
              color = 'green';
              break;
            case 'member_added':
              icon = <TeamOutlined />;
              color = 'purple';
              break;
            default:
              color = 'gray';
          }

          return (
            <Timeline.Item key={event.id} dot={icon} color={color}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {event.title}
                </div>
                <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
                  {event.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {event.user && (
                    <>
                      <Avatar size="small" src={event.user.avatar} />
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {event.user.name} • {dayjs(event.timestamp).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </Card>
  );

  const tabItems = [
    {
      key: 'overview',
      label: 'Tổng quan',
      children: renderOverview()
    },
    {
      key: 'statistics',
      label: 'Thống kê',
      children: statistics ? (
        <ProjectStatisticsComponent statistics={statistics} />
      ) : (
        <div>Đang tải thống kê...</div>
      )
    },
    {
      key: 'tasks',
      label: 'Công việc',
      children: (
        <TaskBoard 
          tasks={project.tasks}
          members={project.members}
          projectId={project.id}
          onTaskUpdate={(taskId, updates) => {
            console.log('Update task:', taskId, updates);
            // TODO: Implement task update
          }}
          onTaskCreate={(task) => {
            console.log('Create task:', task);
            // TODO: Implement task creation
            loadProjectData(); // Reload data
          }}
        />
      )
    },
    {
      key: 'members',
      label: 'Thành viên',
      children: renderMembers()
    },
    {
      key: 'timeline',
      label: 'Timeline',
      children: renderTimeline()
    }
  ];

  return (
    <div className="project-detail">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
        >
          Quay lại
        </Button>
        <Button 
          type="primary" 
          icon={<EditOutlined />}
        >
          Chỉnh sửa dự án
        </Button>
      </div>

      <Tabs 
        defaultActiveKey="overview" 
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default ProjectDetail;
