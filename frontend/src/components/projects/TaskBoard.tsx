'use client';

import React, { useState } from 'react';
import { Card, Tag, Avatar, Button, Modal, Form, Input, Select, DatePicker, Space, Dropdown, MenuProps } from 'antd';
import {
  PlusOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FlagOutlined,
  RobotOutlined,
  DownOutlined
} from '@ant-design/icons';
import { Task, ProjectMember } from '@/types/project';
import TaskCreateWithAI from './TaskCreateWithAI';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface TaskBoardProps {
  tasks: Task[];
  members: ProjectMember[];
  projectId: string; // Add project ID
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskCreate?: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface Column {
  id: Task['status'];
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: 'todo', title: 'Chưa bắt đầu', color: '#d9d9d9' },
  { id: 'in_progress', title: 'Đang thực hiện', color: '#1890ff' },
  { id: 'review', title: 'Đang review', color: '#faad14' },
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

const TaskBoard: React.FC<TaskBoardProps> = ({ 
  tasks, 
  members,
  projectId,
  onTaskUpdate,
  onTaskCreate 
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form] = Form.useForm();

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
      const assignee = members.find(m => m.id === values.assigneeId);
      
      const taskData = {
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        assignee,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : '',
        tags: values.tags || [],
        estimatedHours: values.estimatedHours || 0,
        actualHours: selectedTask?.actualHours || 0
      };

      if (selectedTask) {
        onTaskUpdate?.(selectedTask.id, taskData);
      } else {
        onTaskCreate?.(taskData);
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    onTaskUpdate?.(taskId, { status: newStatus });
  };

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
      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        {columns.map(col => {
          if (col.id !== task.status) {
            return (
              <Button
                key={col.id}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(task.id, col.id);
                }}
                style={{ fontSize: 11, padding: '0 8px' }}
              >
                → {col.title}
              </Button>
            );
          }
          return null;
        })}
      </div>
    </Card>
  );

  return (
    <div className="task-board">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button 
          type="default" 
          icon={<PlusOutlined />}
          onClick={handleCreateTask}
        >
          Tạo thủ công
        </Button>
        <Button 
          type="primary" 
          icon={<RobotOutlined />}
          onClick={() => setIsAIModalVisible(true)}
        >
          Tạo với AI
        </Button>
      </div>

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
          // Reload tasks if needed
          onTaskCreate?.({} as any); // Trigger parent reload
        }}
      />
    </div>
  );
};

export default TaskBoard;
