'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Progress, Avatar, Modal, Form, Input, DatePicker, Select, InputNumber, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/project';
import { projectService, mockMembers } from '@/service/projectService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

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

const ProjectManager: React.FC = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      message.error('Không thể tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleCreate = () => {
    setSelectedProject(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    form.setFieldsValue({
      name: project.name,
      description: project.description,
      status: project.status,
      dateRange: [dayjs(project.startDate), dayjs(project.endDate)],
      budget: project.budget,
      client: project.client,
      managerId: project.manager.id,
      memberIds: project.members.map(m => m.id),
      tags: project.tags
    });
    setIsModalVisible(true);
  };

  const handleDelete = (project: Project) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa dự án "${project.name}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        message.success('Đã xóa dự án thành công!');
        loadProjects();
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      const projectData = {
        ...values,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
      };

      if (selectedProject) {
        message.success('Cập nhật dự án thành công!');
      } else {
        message.success('Tạo dự án mới thành công!');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      loadProjects();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const columns: ColumnsType<Project> = [
    {
      title: 'Mã dự án',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'Tên dự án',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      fixed: 'left',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.description}</div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      filters: Object.keys(statusLabels).map(key => ({
        text: statusLabels[key as keyof typeof statusLabels],
        value: key
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: Project['status']) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      )
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      sorter: (a, b) => a.progress - b.progress,
      render: (progress: number) => (
        <Progress 
          percent={progress} 
          size="small"
          status={progress === 100 ? 'success' : 'active'}
        />
      )
    },
    {
      title: 'Quản lý',
      dataIndex: 'manager',
      key: 'manager',
      width: 180,
      render: (manager) => (
        <Space>
          <Avatar src={manager.avatar} size="small" />
          <span>{manager.name}</span>
        </Space>
      )
    },
    {
      title: 'Thành viên',
      dataIndex: 'members',
      key: 'members',
      width: 120,
      render: (members) => (
        <Avatar.Group maxCount={3} size="small">
          {members.map((member: any) => (
            <Avatar key={member.id} src={member.avatar} />
          ))}
        </Avatar.Group>
      )
    },
    {
      title: 'Khách hàng',
      dataIndex: 'client',
      key: 'client',
      width: 150,
      ellipsis: true
    },
    {
      title: 'Ngân sách',
      dataIndex: 'budget',
      key: 'budget',
      width: 150,
      sorter: (a, b) => (a.budget || 0) - (b.budget || 0),
      render: (budget: number) => formatCurrency(budget || 0)
    },
    {
      title: 'Đã chi',
      dataIndex: 'spent',
      key: 'spent',
      width: 150,
      sorter: (a, b) => (a.spent || 0) - (b.spent || 0),
      render: (spent: number, record) => (
        <span style={{ 
          color: (spent || 0) > (record.budget || 0) ? '#ff4d4f' : '#52c41a' 
        }}>
          {formatCurrency(spent || 0)}
        </span>
      )
    },
    {
      title: 'Thời gian',
      key: 'dateRange',
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>{dayjs(record.startDate).format('DD/MM/YYYY')}</div>
          <div style={{ color: '#999' }}>đến</div>
          <div>{dayjs(record.endDate).format('DD/MM/YYYY')}</div>
        </div>
      )
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <>
          {tags.map(tag => (
            <Tag key={tag} color="blue">{tag}</Tag>
          ))}
        </>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            Xem
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Button 
            type="link" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Quản lý dự án</h2>
        <Button 
          icon={<PlusOutlined />} 
          type="primary"
          onClick={handleCreate}
        >
          Tạo dự án mới
        </Button>
      </div>

      <Table<Project>
        columns={columns}
        dataSource={projects}
        rowKey={(record) => record.id}
        loading={loading}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} dự án`
        }}
        bordered
        scroll={{ x: 1800 }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={selectedProject ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={800}
        okText={selectedProject ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'planning'
          }}
        >
          <Form.Item
            name="name"
            label="Tên dự án"
            rules={[{ required: true, message: 'Vui lòng nhập tên dự án!' }]}
          >
            <Input placeholder="Nhập tên dự án" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Nhập mô tả chi tiết về dự án"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select>
              {Object.entries(statusLabels).map(([key, label]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Thời gian thực hiện"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian!' }]}
          >
            <RangePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="budget"
            label="Ngân sách (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập ngân sách!' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/\$\s?|(,*)/g, '')}
              placeholder="Nhập ngân sách"
            />
          </Form.Item>

          <Form.Item
            name="client"
            label="Khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng!' }]}
          >
            <Input placeholder="Nhập tên khách hàng" />
          </Form.Item>

          <Form.Item
            name="managerId"
            label="Quản lý dự án"
            rules={[{ required: true, message: 'Vui lòng chọn quản lý!' }]}
          >
            <Select placeholder="Chọn quản lý dự án">
              {mockMembers.map(member => (
                <Option key={member.id} value={member.id}>
                  <Space>
                    <Avatar size="small" src={member.avatar} />
                    {member.name} - {member.role}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="memberIds"
            label="Thành viên"
            rules={[{ required: true, message: 'Vui lòng chọn thành viên!' }]}
          >
            <Select 
              mode="multiple"
              placeholder="Chọn thành viên tham gia"
            >
              {mockMembers.map(member => (
                <Option key={member.id} value={member.id}>
                  <Space>
                    <Avatar size="small" src={member.avatar} />
                    {member.name} - {member.role}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Nhập tags cho dự án"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManager;
