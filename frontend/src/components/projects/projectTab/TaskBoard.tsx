'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tag, Avatar, Button, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message, Spin } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  FlagOutlined,
  RobotOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Task, ProjectMember } from '@/types/project';
import TaskCreateWithAI from './TaskCreateWithAI';
import jobService from '@/service/jobService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface TaskBoardProps {
  projectId: string;
}

interface Column {
  id: 'todo' | 'in_progress' | 'done';
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: 'todo', title: 'Chưa bắt đầu', color: '#d9d9d9' },
  { id: 'in_progress', title: 'Đang thực hiện', color: '#1890ff' },
  { id: 'done', title: 'Hoàn thành', color: '#52c41a' }
];

const priorityColors = {
  low: 'blue',
  medium: 'orange',
  high: 'red',
  urgent: 'magenta'
};

const priorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp'
};

const TaskBoard: React.FC<TaskBoardProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'me'>('all');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (projectId) {
      loadTasksAndMembers();
    }
  }, [projectId, viewMode]);

  const loadTasksAndMembers = async () => {
    try {
      setLoading(true);
      const params = viewMode === 'me' ? { assignee_id: 'me' } : {};
      const [tasksRes, membersRes] = await Promise.all([
        jobService.getProjectTasks(projectId, params),
        jobService.getProjectMembers(projectId)
      ]);

      // Map API data to Task format
      const apiTasks = tasksRes.data.tasks || [];
      const mappedTasks: Task[] = apiTasks.map((t: any) => ({
        id: t.task_id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee_id ? {
          id: t.assignee_id,
          name: t.assignee_name,
          email: t.assignee_email,
          role: '',
          avatar: ''
        } : undefined,
        dueDate: t.due_date,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        tags: t.tags || [],
        estimatedHours: t.estimated_hours || 0,
        actualHours: t.actual_hours || 0
      }));

      // Map API data to ProjectMember format
      const apiMembers = membersRes.data.members || [];
      const mappedMembers: ProjectMember[] = apiMembers.map((m: any) => ({
        id: m.user_id,
        name: m.fullName,
        email: m.email,
        role: m.role || '',
        avatar: m.avatar || ''
      }));

      setTasks(mappedTasks);
      setMembers(mappedMembers);
    } catch (error: any) {
      message.error(`Lỗi tải dữ liệu: ${error.response?.data?.details || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    form.setFieldsValue({
      ...task,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      assigneeId: task.assignee?.id
    });
    setIsModalVisible(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // For now, just close modal and show success message
      // TODO: Implement update task API
      message.success('Chức năng cập nhật task sẽ được implement sau');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleStatusChange = useCallback(async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    try {
      setUpdatingTaskId(taskId);
      const response = await jobService.updateTaskStatus(projectId, taskId, newStatus);
      
      if (response.data.success) {
        message.success('Cập nhật trạng thái thành công!');
        await loadTasksAndMembers();
      }
    } catch (error: any) {
      message.error(`Lỗi cập nhật: ${error.response?.data?.details || error.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  }, [projectId]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'all' ? 'me' : 'all');
  }, []);

  const renderTaskCard = (task: Task) => (
    <Card
      key={task.id}
      size="small"
      hoverable
      style={{ marginBottom: 12, cursor: 'pointer' }}
      onClick={() => handleTaskClick(task)}
      bodyStyle={{ padding: 12 }}
    >
      <div style={{ marginBottom: 8 }}>
        <Tag color={priorityColors[task.priority]} style={{ marginRight: 4 }}>
          <FlagOutlined /> {priorityLabels[task.priority]}
        </Tag>
        <span style={{ fontSize: 12, color: '#999' }}>{task.id}</span>
      </div>
      
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
        {task.title}
      </div>
      
      {task.description && (
        <div 
          style={{ 
            fontSize: 12, 
            color: '#666', 
            marginBottom: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {task.description}
        </div>
      )}
      
      {task.tags && task.tags.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {task.tags.map(tag => (
            <Tag key={tag} style={{ fontSize: 11 }}>{tag}</Tag>
          ))}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {task.assignee && (
            <>
              <Avatar 
                size="small" 
                src={task.assignee.avatar} 
                icon={<UserOutlined />}
                style={{ marginRight: 4 }}
              />
              <span style={{ fontSize: 12 }}>{task.assignee.name}</span>
            </>
          )}
        </div>
        {task.dueDate && (
          <div style={{ fontSize: 11, color: '#999' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {dayjs(task.dueDate).format('DD/MM')}
          </div>
        )}
      </div>

      {/* Status Change Buttons */}
      <div 
        style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}
        onClick={(e) => e.stopPropagation()}
      >
        {task.status !== 'in_progress' && task.status !== 'done' && (
          <Popconfirm
            title="Bắt đầu thực hiện?"
            onConfirm={() => handleStatusChange(task.id, 'in_progress')}
            okText="Có"
            cancelText="Không"
          >
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              loading={updatingTaskId === task.id}
              disabled={updatingTaskId !== null && updatingTaskId !== task.id}
              style={{ fontSize: 11 }}
            >
              Đang làm
            </Button>
          </Popconfirm>
        )}
        
        {task.status !== 'done' && (
          <Popconfirm
            title="Đánh dấu hoàn thành?"
            onConfirm={() => handleStatusChange(task.id, 'done')}
            okText="Có"
            cancelText="Không"
          >
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={updatingTaskId === task.id}
              disabled={updatingTaskId !== null && updatingTaskId !== task.id}
              style={{ fontSize: 11, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Hoàn thành
            </Button>
          </Popconfirm>
        )}
        
        {task.status === 'done' && (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Đã hoàn thành
          </Tag>
        )}
      </div>
    </Card>
  );

  return (
    <div className="task-board">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          {viewMode === 'me' && (
            <Tag color="blue" icon={<UserOutlined />}>
              Công việc của tôi
            </Tag>
          )}
        </Space>
        <Space>
          <Button 
            type={viewMode === 'me' ? 'primary' : 'default'}
            icon={viewMode === 'me' ? <UserOutlined /> : <TeamOutlined />}
            onClick={handleToggleViewMode}
            loading={loading}
          >
            {viewMode === 'me' ? 'Xem tất cả' : 'Công việc của tôi'}
          </Button>
          {/* Manual creation removed - creation is available via AI only */}
          <Button 
            type="primary" 
            icon={<RobotOutlined />}
            onClick={() => setIsAIModalVisible(true)}
          >
            Tạo với AI
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="Đang tải công việc..." />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          {columns.map(column => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div
                key={column.id}
                style={{
                  flex: '1 1 300px',
                  minWidth: 300,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  padding: 12
                }}
              >
                <div 
                  style={{ 
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: column.color,
                        marginRight: 8
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {column.title}
                    </span>
                  </div>
                  <Tag color={column.color}>{columnTasks.length}</Tag>
                </div>
                
                <div style={{ minHeight: 100 }}>
                  {columnTasks.map(task => renderTaskCard(task))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <Modal
        title={selectedTask ? 'Cập nhật công việc' : 'Tạo công việc mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText={selectedTask ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'todo',
            priority: 'medium'
          }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
          >
            <Input placeholder="Nhập tiêu đề công việc" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <TextArea 
              rows={4} 
              placeholder="Nhập mô tả chi tiết"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select>
              {columns.map(col => (
                <Option key={col.id} value={col.id}>{col.title}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="Độ ưu tiên"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="low">Thấp</Option>
              <Option value="medium">Trung bình</Option>
              <Option value="high">Cao</Option>
              <Option value="urgent">Khẩn cấp</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="assigneeId"
            label="Người thực hiện"
          >
            <Select 
              placeholder="Chọn người thực hiện"
              allowClear
            >
              {members.map(member => (
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
            name="dueDate"
            label="Hạn hoàn thành"
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
            />
          </Form.Item>

          <Form.Item
            name="estimatedHours"
            label="Thời gian ước tính (giờ)"
          >
            <Input type="number" placeholder="Nhập số giờ" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Nhập tags"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* AI Task Creation Modal */}
      <TaskCreateWithAI
        visible={isAIModalVisible}
        projectId={projectId}
        members={members}
        onCancel={() => setIsAIModalVisible(false)}
        onSuccess={() => {
          setIsAIModalVisible(false);
          loadTasksAndMembers(); // Reload tasks after creation
        }}
      />
    </div>
  );
};

export default TaskBoard;
