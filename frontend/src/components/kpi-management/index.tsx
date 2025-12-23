'use client';

import React, { useState, useEffect } from 'react';
import { 
  Space, Typography, Tag, Tooltip, Badge, Select, Card, Row, Col, 
  Statistic, Drawer, Tabs, Table, Avatar, message, Spin 
} from 'antd';
import { 
  EyeOutlined, TrophyOutlined, CheckCircleOutlined, 
  RiseOutlined, FallOutlined, DashOutlined 
} from '@ant-design/icons';
import jobService from '@/service/jobService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserKpiData {
  user_id: number;
  user_name: string;
  month: number;
  year: number;
  total_tasks: number;
  early_tasks: number;
  on_time_tasks: number;
  late_tasks: number;
  kpi_score: number;
  kpi_grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  avg_delay_days: number | null;
}

interface ProjectKpiData extends UserKpiData {
  project_id: number;
  project_name: string;
}

interface KpiManagementListProps {}

const KpiManagementList: React.FC<KpiManagementListProps> = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());
  const [loading, setLoading] = useState(false);
  const [kpiData, setKpiData] = useState<UserKpiData[]>([]);
  
  // Detail drawer state
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserKpiData | null>(null);
  const [projectKpiDetails, setProjectKpiDetails] = useState<ProjectKpiData[]>([]);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);

  // Fetch KPI data
  const fetchKpiData = async () => {
    setLoading(true);
    try {
      const response = await jobService.getAllUsersKpi({
        month: selectedMonth,
        year: selectedYear
      });
      
      if (response.data?.success) {
        setKpiData(response.data.data || []);
      } else {
        message.error('Không thể tải dữ liệu KPI');
      }
    } catch (error: any) {
      console.error('Error fetching KPI data:', error);
      message.error(error.response?.data?.error || 'Có lỗi xảy ra khi tải dữ liệu KPI');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when month/year changes
  useEffect(() => {
    fetchKpiData();
  }, [selectedMonth, selectedYear]);

  // Get grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#52c41a'; // Green
      case 'B': return '#73d13d';
      case 'C': return '#1890ff'; // Blue
      case 'D': return '#faad14'; // Yellow
      case 'E': return '#ff7a45'; // Orange
      case 'F': return '#ff4d4f'; // Red
      default: return '#d9d9d9';
    }
  };

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'A': return 'Xuất sắc';
      case 'B': return 'Tốt';
      case 'C': return 'Khá';
      case 'D': return 'Trung bình';
      case 'E': return 'Yếu';
      case 'F': return 'Kém';
      default: return '';
    }
  };

  // Handle view detail
  const handleViewDetail = async (record: UserKpiData) => {
    setSelectedUser(record);
    setDetailDrawerVisible(true);
    setLoadingProjectDetails(true);
    
    try {
      const response = await jobService.getUserProjectKpiDetails(
        String(record.user_id),
        { month: selectedMonth, year: selectedYear }
      );
      
      if (response.data?.success) {
        setProjectKpiDetails(response.data.data || []);
      } else {
        message.error('Không thể tải chi tiết KPI theo dự án');
      }
    } catch (error: any) {
      console.error('Error fetching project KPI details:', error);
      message.error('Có lỗi xảy ra khi tải chi tiết KPI');
    } finally {
      setLoadingProjectDetails(false);
    }
  };

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (kpiData.length === 0) {
      return {
        totalUsers: 0,
        avgScore: 0,
        totalTasks: 0,
        totalEarly: 0,
        totalOnTime: 0,
        totalLate: 0
      };
    }

    const totalTasks = kpiData.reduce((sum, user) => sum + user.total_tasks, 0);
    const totalEarly = kpiData.reduce((sum, user) => sum + user.early_tasks, 0);
    const totalOnTime = kpiData.reduce((sum, user) => sum + user.on_time_tasks, 0);
    const totalLate = kpiData.reduce((sum, user) => sum + user.late_tasks, 0);
    const avgScore = kpiData.reduce((sum, user) => sum + user.kpi_score, 0) / kpiData.length;

    return {
      totalUsers: kpiData.length,
      avgScore: Math.round(avgScore * 100) / 100,
      totalTasks,
      totalEarly,
      totalOnTime,
      totalLate
    };
  }, [kpiData]);

  // Table columns for main table
  const mainColumns = [
    {
      title: 'Nhân viên',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 250,
      render: (text: string, record: UserKpiData) => (
        <Space>
          <Avatar size={40}>
            {text?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {record.user_id}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Xếp hạng',
      dataIndex: 'kpi_grade',
      key: 'kpi_grade',
      width: 120,
      align: 'center' as const,
      sorter: (a: UserKpiData, b: UserKpiData) => a.kpi_grade.localeCompare(b.kpi_grade),
      render: (grade: string) => (
        <Tooltip title={getGradeDescription(grade)}>
          <Badge
            count={grade}
            style={{
              backgroundColor: getGradeColor(grade),
              fontSize: 16,
              fontWeight: 'bold',
              minWidth: 36,
              height: 36,
              lineHeight: '36px'
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: 'KPI Score',
      dataIndex: 'kpi_score',
      key: 'kpi_score',
      width: 150,
      align: 'center' as const,
      sorter: (a: UserKpiData, b: UserKpiData) => a.kpi_score - b.kpi_score,
      render: (score: number) => (
        <Text strong style={{ fontSize: 18, color: score >= 75 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f' }}>
          {score}%
        </Text>
      ),
    },
    {
      title: 'Tổng task',
      dataIndex: 'total_tasks',
      key: 'total_tasks',
      width: 120,
      align: 'center' as const,
      sorter: (a: UserKpiData, b: UserKpiData) => a.total_tasks - b.total_tasks,
      render: (total: number) => (
        <Text strong style={{ fontSize: 16 }}>{total}</Text>
      ),
    },
    {
      title: 'Vượt tiến độ',
      dataIndex: 'early_tasks',
      key: 'early_tasks',
      width: 130,
      align: 'center' as const,
      sorter: (a: UserKpiData, b: UserKpiData) => a.early_tasks - b.early_tasks,
      render: (early: number) => (
        <Space>
          <RiseOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          <Text style={{ color: '#52c41a', fontWeight: 500 }}>{early}</Text>
        </Space>
      ),
    },
    {
      title: 'Đúng hạn',
      dataIndex: 'on_time_tasks',
      key: 'on_time_tasks',
      width: 120,
      align: 'center' as const,
      sorter: (a: UserKpiData, b: UserKpiData) => a.on_time_tasks - b.on_time_tasks,
      render: (onTime: number) => (
        <Space>
          <DashOutlined style={{ color: '#1890ff', fontSize: 16 }} />
          <Text style={{ color: '#1890ff', fontWeight: 500 }}>{onTime}</Text>
        </Space>
      ),
    },
    {
      title: 'Chậm tiến độ',
      dataIndex: 'late_tasks',
      key: 'late_tasks',
      width: 130,
      align: 'center' as const,
      sorter: (a: UserKpiData, b: UserKpiData) => a.late_tasks - b.late_tasks,
      render: (late: number) => (
        <Space>
          <FallOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
          <Text style={{ color: '#ff4d4f', fontWeight: 500 }}>{late}</Text>
        </Space>
      ),
    },
    {
      title: 'TB Trễ',
      dataIndex: 'avg_delay_days',
      key: 'avg_delay_days',
      width: 120,
      align: 'center' as const,
      sorter: (a: UserKpiData, b: UserKpiData) => (a.avg_delay_days || 0) - (b.avg_delay_days || 0),
      render: (avgDelay: number | null) => {
        if (avgDelay === null || avgDelay === 0) return <Text>-</Text>;
        const color = avgDelay > 0 ? '#ff4d4f' : '#52c41a';
        const sign = avgDelay > 0 ? '+' : '';
        return (
          <Text style={{ color }}>
            {sign}{avgDelay} ngày
          </Text>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: UserKpiData) => (
        <Tooltip title="Xem chi tiết theo dự án">
          <EyeOutlined
            style={{ fontSize: 18, color: '#1890ff', cursor: 'pointer' }}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // Project details columns
  const projectColumns = [
    {
      title: 'Dự án',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 250,
    },
    {
      title: 'Xếp hạng',
      dataIndex: 'kpi_grade',
      key: 'kpi_grade',
      width: 100,
      align: 'center' as const,
      render: (grade: string) => (
        <Badge
          count={grade}
          style={{
            backgroundColor: getGradeColor(grade),
            fontSize: 14,
            fontWeight: 'bold',
            minWidth: 30,
            height: 30,
            lineHeight: '30px'
          }}
        />
      ),
    },
    {
      title: 'KPI Score',
      dataIndex: 'kpi_score',
      key: 'kpi_score',
      width: 120,
      align: 'center' as const,
      render: (score: number) => (
        <Text strong style={{ color: score >= 75 ? '#52c41a' : score >= 50 ? '#faad14' : '#ff4d4f' }}>
          {score}%
        </Text>
      ),
    },
    {
      title: 'Tổng',
      dataIndex: 'total_tasks',
      key: 'total_tasks',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Sớm',
      dataIndex: 'early_tasks',
      key: 'early_tasks',
      width: 80,
      align: 'center' as const,
      render: (early: number) => (
        <Text style={{ color: '#52c41a' }}>{early}</Text>
      ),
    },
    {
      title: 'Đúng hạn',
      dataIndex: 'on_time_tasks',
      key: 'on_time_tasks',
      width: 80,
      align: 'center' as const,
      render: (onTime: number) => (
        <Text style={{ color: '#1890ff' }}>{onTime}</Text>
      ),
    },
    {
      title: 'Chậm',
      dataIndex: 'late_tasks',
      key: 'late_tasks',
      width: 80,
      align: 'center' as const,
      render: (late: number) => (
        <Text style={{ color: '#ff4d4f' }}>{late}</Text>
      ),
    },
  ];

  return (
    <div>
      {/* Filters Section */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Tháng:</Text>
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedMonth}
              onChange={(value) => setSelectedMonth(value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <Option key={month} value={month}>
                  Tháng {month}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Năm:</Text>
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedYear}
              onChange={(value) => setSelectedYear(value)}
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <Option key={year} value={year}>
                  {year}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Summary Cards */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Tổng nhân viên"
              value={summaryStats.totalUsers}
              prefix={<TrophyOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="KPI trung bình"
              value={summaryStats.avgScore}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: summaryStats.avgScore >= 75 ? '#52c41a' : summaryStats.avgScore >= 50 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Tổng task"
              value={summaryStats.totalTasks}
            />
          </Col>
          <Col span={6}>
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>Phân bố tiến độ</Text>
              <Space size={16}>
                <Text style={{ color: '#52c41a' }}>
                  <RiseOutlined /> {summaryStats.totalEarly}
                </Text>
                <Text style={{ color: '#1890ff' }}>
                  <DashOutlined /> {summaryStats.totalOnTime}
                </Text>
                <Text style={{ color: '#ff4d4f' }}>
                  <FallOutlined /> {summaryStats.totalLate}
                </Text>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={mainColumns}
            dataSource={kpiData}
            rowKey="user_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} nhân viên`,
            }}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title={`Chi tiết KPI theo dự án - ${selectedUser?.user_name || ''}`}
        placement="right"
        width={900}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedUser(null);
          setProjectKpiDetails([]);
        }}
      >
        {selectedUser && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Space>
                  <Avatar size={64}>
                    {selectedUser.user_name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {selectedUser.user_name}
                    </Title>
                    <Space>
                      <Badge
                        count={selectedUser.kpi_grade}
                        style={{
                          backgroundColor: getGradeColor(selectedUser.kpi_grade),
                          fontSize: 14,
                          fontWeight: 'bold'
                        }}
                      />
                      <Text type="secondary">
                        {getGradeDescription(selectedUser.kpi_grade)}
                      </Text>
                    </Space>
                  </div>
                </Space>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="KPI Score"
                      value={selectedUser.kpi_score}
                      suffix="%"
                      valueStyle={{
                        color: selectedUser.kpi_score >= 75 ? '#52c41a' : 
                               selectedUser.kpi_score >= 50 ? '#faad14' : '#ff4d4f'
                      }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Tổng task"
                      value={selectedUser.total_tasks}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="TB Trễ"
                      value={selectedUser.avg_delay_days || 0}
                      suffix="ngày"
                      valueStyle={{
                        color: (selectedUser.avg_delay_days || 0) > 0 ? '#ff4d4f' : '#52c41a'
                      }}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>

            <Card title="Chi tiết theo từng dự án">
              <Spin spinning={loadingProjectDetails}>
                <Table
                  columns={projectColumns}
                  dataSource={projectKpiDetails}
                  rowKey="project_id"
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </Spin>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default KpiManagementList;
