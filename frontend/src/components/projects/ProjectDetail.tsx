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
import { Project, ProjectStatistics, TimelineEvent, Task } from '@/types/project';
import { projectService } from '@/service/projectService';
import jobService from '@/service/jobService';
import ProjectStatisticsComponent from './projectTab/ProjectStatistics';
import TaskBoard from './projectTab/TaskBoard';
import ProjectExpenses from './ProjectExpenses';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [realProject, setRealProject] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [userScope, setUserScope] = useState<string>('personal');

  useEffect(() => {
    loadProjectOverview();
  }, [projectId]);

  useEffect(() => {
    // Gọi API khi chuyển tab
    if (activeTab === 'statistics') {
      loadStatistics();
    } else if (activeTab === 'members') {
      loadMembers();
    } else if (activeTab === 'timeline') {
      loadTimeline();
    }
  }, [activeTab]);

  const loadProjectOverview = async () => {
    try {
      setLoading(true);
      const response = await jobService.getProjectOverview(projectId);
      const data = response?.data?.project || null;
      setRealProject(data);
      if (data?.scope) {
        setUserScope(data.scope);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await jobService.getProjectTaskStatistics(projectId);
      setStatistics(response?.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await jobService.getProjectMembers(projectId);
      setMembers(response?.data?.members || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadTimeline = async () => {
    try {
      const response = await jobService.getProjectTimeline(projectId, { limit: 50 });
      setTimeline(response?.data?.events || []);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!realProject) {
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

  const getInitials = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderOverview = () => (
    <div>
      {/* Project Header - balanced columns */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <ProjectOutlined style={{ fontSize: 32, marginRight: 16, color: '#1890ff' }} />
              <div>
                <h2 style={{ margin: 0 }}>{realProject.name}</h2>
                <Tag color={statusColors[realProject.status as keyof typeof statusColors] || 'default'} style={{ marginTop: 8 }}>
                  {statusLabels[realProject.status as keyof typeof statusLabels] || realProject.status}
                </Tag>
              </div>
            </div>
            <p style={{ fontSize: 16, color: '#666' }}>{realProject.description}</p>
            <div style={{ marginTop: 16 }}>
              {(realProject.tags || []).map((tag: string) => (
                <Tag key={tag} color="blue">{tag}</Tag>
              ))}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>
                  Tiến độ dự án
                </div>
                <Progress
                  type="circle"
                  percent={realProject.progress || 0}
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

      {/* Project Details - two columns only */}
      <Card title="Thông tin chi tiết">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Mã dự án">
            {realProject.project_id}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={statusColors[realProject.status as keyof typeof statusColors] || 'default'}>
              {statusLabels[realProject.status as keyof typeof statusLabels] || realProject.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Tên dự án">
            {realProject.name}
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả">
            {realProject.description}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày bắt đầu">
            <CalendarOutlined style={{ marginRight: 8 }} />
            {dayjs(realProject.start_date).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày kết thúc">
            <CalendarOutlined style={{ marginRight: 8 }} />
            {dayjs(realProject.end_date).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Quản lý dự án">
            <Space>
              <Avatar src={realProject.manager_id?.identificationPhoto}>{!realProject.manager_id?.identificationPhoto && getInitials(realProject.manager_id?.fullName || realProject.manager_id?.username)}</Avatar>
              {realProject.manager_id?.fullName || realProject.manager_id?.username} - {realProject.manager_id?.role || 'Manager'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Khách hàng">
            {realProject.customer}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  const renderMembers = () => (
    <Row gutter={[16, 16]}>
      {members.map((member: any) => {
        return (
          <Col xs={24} sm={12} md={8} lg={6} key={member.user_id}>
            <Card hoverable>
              <div style={{ textAlign: 'center' }}>
                <Avatar
                  size={64}
                  src={member.avatar}
                  style={{ marginBottom: 12 }}
                >{!member.avatar && getInitials(member.fullName)}</Avatar>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                  {member.fullName}
                </div>
                <Tag color="blue">{member.role}</Tag>
                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                  {member.email}
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );

  const renderTimeline = () => (
    <Card>
      <Timeline mode="left">
        {timeline.map((event: any) => {
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

          const user = event.user || {};
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
                  {user && user.id && (
                    <>
                      <Avatar size="small" src={user.avatar}>{!user.avatar && getInitials(user.fullName)}</Avatar>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {user.fullName} • {dayjs(event.timestamp).format('DD/MM/YYYY HH:mm')}
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
        <ProjectStatisticsComponent statistics={statistics.statistics} charts={statistics.charts} />
      ) : (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Đang tải thống kê..." />
        </div>
      )
    },
    {
      key: 'tasks',
      label: 'Công việc',
      children: <TaskBoard projectId={projectId} />
    },
    {
      key: 'members',
      label: 'Thành viên',
      children: members.length > 0 ? renderMembers() : (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Đang tải thành viên..." />
        </div>
      )
    },
    {
      key: 'timeline',
      label: 'Timeline',
      children: timeline.length > 0 ? renderTimeline() : (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Đang tải timeline..." />
        </div>
      )
    },
    {
      key: 'expenses',
      label: 'Chi tiêu',
      icon: <DollarOutlined />,
      children: <ProjectExpenses projectId={projectId} project={realProject} />
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
        {userScope !== 'personal' && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => router.push(`/projects/${projectId}/edit`)}
          >
            Chỉnh sửa
          </Button>
        )}
      </div>

      <Tabs
        defaultActiveKey="overview"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default ProjectDetail;
