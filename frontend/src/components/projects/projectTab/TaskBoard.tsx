'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tag, Avatar, Button, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message, Spin, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  FlagOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { FaMagic } from "react-icons/fa";
import { Task, ProjectMember } from '@/types/project';
import TaskCreateWithAI from './TaskCreateWithAI';
import jobService from '@/service/jobService';
import { attendanceService } from '@/service/attendanceService';
import dayjs from 'dayjs';
import Cookies from 'js-cookie';
import { getDecodedToken } from '@/utils/decode-token';

const { TextArea } = Input;
const { Option } = Select;

interface TaskBoardProps {
  projectId: string;
}

interface Column {
  id: 'todo' | 'in_progress' | 'pending_approval' | 'done';
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: 'todo', title: 'Chưa bắt đầu', color: '#d9d9d9' },
  { id: 'in_progress', title: 'Đang thực hiện', color: '#1890ff' },
  { id: 'pending_approval', title: 'Chờ phê duyệt', color: '#fa8c16' },
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isProjectManager, setIsProjectManager] = useState(false);
  const [projectManagerIdState, setProjectManagerIdState] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'me'>('all');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [manualForm] = Form.useForm();
  const [startDateComputed, setStartDateComputed] = useState(false);
  const [workingDays, setWorkingDays] = useState<{
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  } | null>(null);

  useEffect(() => {
    if (projectId) {
      loadTasksAndMembers();
    }
  }, [projectId, viewMode]);

  // Fetch working days when modals open or project changes
  useEffect(() => {
    if (projectId && (isModalVisible || isManualModalVisible || isAIModalVisible)) {
      fetchWorkingDays();
    }
  }, [projectId, isModalVisible, isManualModalVisible, isAIModalVisible]);

  const fetchWorkingDays = async () => {
    try {
      const setting = await attendanceService.getSettingByKey('WorkingDays');
      if (setting && setting.value) {
        const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        setWorkingDays(parsed);
      }
    } catch (err) {
      // fallback to Mon-Fri
      setWorkingDays({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      });
    }
  };

  const isWorkingDay = (date: any): boolean => {
    if (!workingDays) return true;
    const dayOfWeek = date.day(); // 0=Sunday
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayMap[dayOfWeek] as keyof typeof workingDays;
    return workingDays[dayKey] === true;
  };

  const loadTasksAndMembers = async () => {
    try {
      setLoading(true);
      const params = viewMode === 'me' ? { assignee_id: 'me' } : {};
      const [tasksRes, membersRes, projectRes] = await Promise.all([
        jobService.getProjectTasks(projectId, params),
        jobService.getProjectMembers(projectId),
        jobService.getProjectById(projectId)
      ]);

      // Map API data to Task format
      const apiTasks = tasksRes.data.tasks || [];
      const mappedTasks: Task[] = apiTasks.map((t: any) => {
        // normalize canonical days field while keeping hours for compatibility
        const estDays = typeof t.estimated_days !== 'undefined' && t.estimated_days !== null
          ? t.estimated_days
          : Math.max(1, Math.ceil((t.estimated_hours || 0) / 8));

        return {
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
          estimatedDays: estDays,
          estimatedHours: t.estimated_hours || (estDays * 8),
          actualHours: t.actual_hours || 0,
          startDate: t.start_date
        } as Task;
      });

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

      // Get project manager_id from project data (handle multiple possible response shapes)
      console.log('🔎 [TaskBoard] raw projectRes:', projectRes);
      let projectManagerId =
        // Axios-style: { data: { project: { manager_id }}}
        projectRes?.data?.project?.manager_id ||
        // Old-style: { project: { manager_id }}
        projectRes?.project?.manager_id ||
        // Direct payload: { manager_id: 3 }
        projectRes?.data?.manager_id ||
        projectRes?.manager_id ||
        null;

      // Fallback: if manager_id not present, try the overview endpoint
      if (!projectManagerId) {
        try {
          const overviewRes = await jobService.getProjectOverview(projectId);
          console.log('🔎 [TaskBoard] projectOverviewRes:', overviewRes);
          const overviewManagerId =
            overviewRes?.data?.project?.manager_id ||
            overviewRes?.project?.manager_id ||
            overviewRes?.data?.manager_id ||
            overviewRes?.manager_id ||
            null;
          if (overviewManagerId) projectManagerId = overviewManagerId;
        } catch (e) {
          console.warn('⚠️ [TaskBoard] Could not fetch project overview for manager_id fallback', e);
        }
      }

      // Determine current user and whether they are project manager
      try {
        // Robust token extraction: check several common storage keys
        const tokenKeys = ['token', 'accessToken', 'access_token', 'authToken', 'authorization'];
        let token: string | undefined | null = null;
        let tokenKeyUsed: string | null = null;
        if (typeof window !== 'undefined') {
          for (const k of tokenKeys) {
            const fromLocal = window.localStorage?.getItem(k);
            const fromCookie = Cookies.get(k);
            if (fromLocal) { token = fromLocal; tokenKeyUsed = `localStorage:${k}`; break; }
            if (fromCookie) { token = fromCookie; tokenKeyUsed = `cookie:${k}`; break; }
          }
        } else {
          for (const k of tokenKeys) {
            const fromCookie = Cookies.get(k);
            if (fromCookie) { token = fromCookie; tokenKeyUsed = `cookie:${k}`; break; }
          }
        }

        const decoded = token ? getDecodedToken(token) : null;
        const uid = decoded?.sub ? String(decoded.sub) : null;
        setCurrentUserId(uid);

        console.log('🔐 [TaskBoard] token check:', { tokenKeyUsed, tokenPreview: token ? `${String(token).slice(0,10)}...` : null, decoded });

        if (!uid) {
          console.warn('⚠️ [TaskBoard] No user ID found in token (uid is null).');
          setIsProjectManager(false);
          return;
        }

        // Check 1: Is user the project manager (by manager_id)?
        const isProjectOwner = projectManagerId && String(projectManagerId) === String(uid);

        // Check 2: Does user have manager role in project members?
        const memberMatch = mappedMembers.find(m => String(m.id) === String(uid));
        const roleStr = memberMatch ? String(memberMatch.role || '').toLowerCase() : '';
        const hasManagerRole = roleStr.includes('manager') || 
                               roleStr.includes('project') || 
                               roleStr.includes('quản') || 
                               roleStr.includes('ql') || 
                               roleStr.includes('trưởng') || 
                               roleStr.includes('admin') || 
                               roleStr.includes('pm');

        const isManager = !!(isProjectOwner || hasManagerRole);
        setIsProjectManager(isManager);
        setProjectManagerIdState(projectManagerId ? String(projectManagerId) : null);
        
        console.log('🔍 [TaskBoard] Manager check:', {
          currentUserId: uid,
          projectManagerId: projectManagerId,
          isProjectOwner: isProjectOwner,
          memberMatch: memberMatch ? { id: memberMatch.id, role: memberMatch.role } : null,
          hasManagerRole: hasManagerRole,
          finalIsManager: isManager
        });
      } catch (err) {
        console.error('❌ [TaskBoard] Error detecting user role:', err);
        setCurrentUserId(null);
        setIsProjectManager(false);
      }
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
    // Only project managers can update task info, and only when task is in 'todo'
    const isManagerForUI = !!(
      (projectManagerIdState && currentUserId && String(projectManagerIdState) === String(currentUserId)) ||
      isProjectManager
    );

    if (!isManagerForUI) {
      message.warning('Chỉ quản lý dự án mới có quyền cập nhật thông tin task');
      return;
    }

    if (task.status !== 'todo') {
      message.warning('Chỉ được cập nhật thông tin khi task ở trạng thái "Chưa bắt đầu"');
      return;
    }

    setSelectedTask(task);
    // If backend didn't provide a startDate, compute a reasonable estimate
    // from dueDate - estimatedDays so the edit modal is pre-filled for convenience.
    const explicitStart = task.startDate ? dayjs(task.startDate) : null;
    const explicitDue = task.dueDate ? dayjs(task.dueDate) : null;
    const estDays = typeof task.estimatedDays === 'number' ? task.estimatedDays : undefined;
    const computedStart = (!explicitStart && explicitDue && estDays)
      ? explicitDue.subtract(estDays, 'day')
      : null;

    form.setFieldsValue({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assignee?.id,
      start_date: explicitStart || computedStart || null,
      due_date: explicitDue || null,
      estimatedDays: task.estimatedDays
    });
    setStartDateComputed(!!(computedStart && !explicitStart));
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

      // Auto-calculate estimated_days from start_date and due_date
      let estimatedDays = values.estimatedDays;
      if (values.start_date && values.due_date) {
        const start = dayjs(values.start_date);
        const due = dayjs(values.due_date);
        estimatedDays = Math.max(1, due.diff(start, 'day'));
      }

      const payload = {
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        assignee_id: values.assigneeId,
        // Only include start_date if user explicitly set it, or if it's an existing explicit value.
        // If we populated the field with a computed estimate and the user didn't edit it,
        // omit start_date to avoid overwriting server data unintentionally.
        ...(function() {
          const s: any = {};
          if (values.start_date) {
            let include = true;
            if (startDateComputed && selectedTask) {
              const explicitDue = selectedTask.dueDate ? dayjs(selectedTask.dueDate) : null;
              const estDays = typeof selectedTask.estimatedDays === 'number' ? selectedTask.estimatedDays : undefined;
              const computedStart = (!selectedTask.startDate && explicitDue && estDays) ? explicitDue.subtract(estDays, 'day') : null;
              if (computedStart && dayjs(values.start_date).isSame(computedStart, 'day')) {
                // user didn't change the computed start date; don't include it
                include = false;
              }
            }
            if (include) s.start_date = dayjs(values.start_date).format('YYYY-MM-DD');
          }
          return s;
        })(),
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : undefined,
        estimated_days: estimatedDays,
        estimated_hours: estimatedDays ? estimatedDays * 8 : undefined
      };

      const response = await jobService.updateTask(projectId, selectedTask!.id, payload);

      if (response.data.success) {
        message.success('Cập nhật task thành công!');
        setIsModalVisible(false);
        form.resetFields();
        await loadTasksAndMembers();
      }
    } catch (error: any) {
      message.error(`Lỗi cập nhật: ${error.response?.data?.details || error.message}`);
    }
  };

  const handleDeleteTask = useCallback(async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      const response = await jobService.deleteTask(projectId, taskId);
      if (response.data.success) {
        message.success('Xóa task thành công!');
        await loadTasksAndMembers();
      }
    } catch (error: any) {
      message.error(`Lỗi xóa task: ${error.response?.data?.details || error.message}`);
    }
  }, [projectId]);

  const handleManualTaskCreate = async () => {
    try {
      const values = await manualForm.validateFields();

      // Auto-calculate estimated_days from start_date and due_date
      let estimatedDays = values.estimatedDays;
      if (values.start_date && values.due_date) {
        const start = dayjs(values.start_date);
        const due = dayjs(values.due_date);
        estimatedDays = Math.max(1, due.diff(start, 'day'));
      }

      const payload = {
        title: values.title,
        description: values.description,
        project_id: projectId,
        status: 'todo',
        priority: values.priority || 'medium',
        assigned_to_user_id: values.assigneeId,
        start_date: values.start_date ? dayjs(values.start_date).format('YYYY-MM-DD') : undefined,
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : undefined,
        estimated_days: estimatedDays,
        estimated_hours: estimatedDays ? estimatedDays * 8 : undefined,
        required_skills: [] // Manual creation - no AI analysis
      };

      const response = await jobService.createJobWithAnalysis(payload);

      if (response.data.success) {
        message.success('Tạo task thủ công thành công!');
        setIsManualModalVisible(false);
        manualForm.resetFields();
        await loadTasksAndMembers();
      }
    } catch (error: any) {
      message.error(`Lỗi tạo task: ${error.response?.data?.details || error.message}`);
    }
  };

  const handleStatusChange = useCallback(async (taskId: string, newStatus: 'todo' | 'in_progress' | 'pending_approval' | 'done') => {
    try {
      setUpdatingTaskId(taskId);
      const response = await jobService.updateTaskStatus(projectId, taskId, newStatus);

      if (response.data.success) {
        const statusLabels = {
          'todo': 'Chưa bắt đầu',
          'in_progress': 'Đang làm',
          'pending_approval': 'Chờ duyệt',
          'done': 'Hoàn thành'
        };
        message.success(`Cập nhật trạng thái thành công: ${statusLabels[newStatus]}!`);
        await loadTasksAndMembers();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.details || error.message;
      message.error(`Lỗi cập nhật: ${errorMsg}`);
    } finally {
      setUpdatingTaskId(null);
    }
  }, [projectId]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'all' ? 'me' : 'all');
  }, []);

  const renderTaskCard = (task: Task) => {
    // Check if task is overdue
    const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), 'day') && task.status !== 'done';
    
    const cardStyle = {
      marginBottom: 12,
      cursor: 'pointer',
      position: 'relative' as const,
      ...(isOverdue ? {
        borderColor: '#ff4d4f',
        borderWidth: 2,
        backgroundColor: '#fff2f0'
      } : {})
    };

    return (
    <Card
      key={task.id}
      size="small"
      hoverable
      style={cardStyle}
      onClick={() => handleTaskClick(task)}
      bodyStyle={{ padding: 12 }}
    >
      {/* Delete Button - only visible to project managers for TODO tasks */}
      {task.status === 'todo' && isProjectManager ? (
        <Popconfirm
          title="Xóa task này?"
          description="Bạn có chắc chắn muốn xóa task này?"
          onConfirm={(e) => handleDeleteTask(task.id, e)}
          onCancel={(e) => e?.stopPropagation()}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<CloseOutlined />}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      ) : null}

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
          {task.tags
            .filter(tag => {
              const t = String(tag || '').toLowerCase();
              // hide tags that are actually status markers we already show elsewhere
              if (t.includes('phê duyệt') || t.includes('chờ phê duyệt') || t.includes('pending') || t.includes('pending_approval')) return false;
              return true;
            })
            .map(tag => (
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
        {(task.startDate || task.dueDate) && (
          <div style={{ fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {(() => {
              // Compute a display start date: use explicit startDate if present, otherwise
              // try to estimate from dueDate - estimatedDays (frontend-only display fallback).
              const explicitStart = task.startDate ? dayjs(task.startDate) : null;
              const explicitDue = task.dueDate ? dayjs(task.dueDate) : null;
              const estDays = typeof task.estimatedDays === 'number' ? task.estimatedDays : undefined;
              const computedStart = (!explicitStart && explicitDue && estDays)
                ? explicitDue.subtract(estDays, 'day')
                : null;

              const displayStart = explicitStart || computedStart;
              const isComputed = !!computedStart && !explicitStart;

              return (
                <>
                  {displayStart && (
                    <span title={displayStart.format('DD/MM/YYYY')}>
                      {displayStart.format('DD/MM')}{isComputed ? ' (ước tính)' : ''}
                    </span>
                  )}

                  {displayStart && task.dueDate && <span style={{ opacity: 0.6 }}>→</span>}

                  {task.dueDate && (
                    <span title={task.dueDate ? dayjs(task.dueDate).format('DD/MM/YYYY') : ''}>
                      {dayjs(task.dueDate).format('DD/MM')}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Status Change Buttons */}
      <div
        style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}
        onClick={(e) => e.stopPropagation()}
      >
        {(() => {
          const notStarted = task.startDate ? dayjs(task.startDate).isAfter(dayjs(), 'day') : false;

          const startDisabled = notStarted || (updatingTaskId !== null && updatingTaskId !== task.id);
          const completeDisabled = notStarted || (updatingTaskId !== null && updatingTaskId !== task.id);

          // Check if current user has permission to update task status
          const isAssignee = !!(task.assignee && currentUserId && String(task.assignee.id) === String(currentUserId));
          // Only assignee can start/complete tasks (project manager cannot unless also assignee)
          const canUpdateStatus = isAssignee;
          const isProjectOwnerForUI = projectManagerIdState && currentUserId && String(projectManagerIdState) === String(currentUserId);
          
          // Always log for debugging
          console.log(`🔍 [TaskBoard] Permission for "${task.title}":`, {
            taskId: task.id,
            assigneeId: task.assignee?.id,
            assigneeName: task.assignee?.name,
            currentUserId: currentUserId,
            isAssignee: isAssignee,
            isProjectManager: isProjectManager,
            isProjectOwnerForUI: isProjectOwnerForUI,
            canUpdateStatus: canUpdateStatus
          });

          const startButton = (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              loading={updatingTaskId === task.id}
              disabled={startDisabled}
              style={{ fontSize: 11 }}
              onClick={(e) => { e.stopPropagation(); }}
            >
              Đang làm
            </Button>
          );

          const completeButton = (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={updatingTaskId === task.id}
              disabled={completeDisabled}
              style={{ fontSize: 11, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={(e) => { e.stopPropagation(); }}
            >
              Hoàn thành
            </Button>
          );

          return (
            <>
              {/* Start button - only show if user has permission */}
              {canUpdateStatus && (task.status !== 'in_progress' && task.status !== 'done' && task.status !== 'pending_approval') ? (
                notStarted ? (
                  <Tooltip title={`Task bắt đầu vào ${dayjs(task.startDate).format('DD/MM/YYYY')}`}>
                    {startButton}
                  </Tooltip>
                ) : (
                  <Popconfirm
                    title="Bắt đầu thực hiện?"
                    onConfirm={() => handleStatusChange(task.id, 'in_progress')}
                    okText="Có"
                    cancelText="Không"
                  >
                    {startButton}
                  </Popconfirm>
                )
              ) : null}

              {/* Complete button - only show if user has permission */}
              {canUpdateStatus && (task.status !== 'done' && task.status !== 'todo' && task.status !== 'pending_approval') ? (
                notStarted ? (
                  <Tooltip title={`Task bắt đầu vào ${dayjs(task.startDate).format('DD/MM/YYYY')}`}>
                    {completeButton}
                  </Tooltip>
                ) : (
                  <Popconfirm
                    title="Đánh dấu hoàn thành?"
                    description="Task sẽ chuyển sang trạng thái chờ duyệt"
                    onConfirm={() => handleStatusChange(task.id, 'pending_approval')}
                    okText="Có"
                    cancelText="Không"
                  >
                    {completeButton}
                  </Popconfirm>
                )
              ) : null}

              {/* Approve button - only show if user is project manager */}
              {task.status === 'pending_approval' && isProjectOwnerForUI && (
                <Tooltip title="Phê duyệt (Quản lý)">
                  <Popconfirm
                    title="Phê duyệt task này?"
                    description="Task sẽ được đánh dấu là hoàn thành"
                    onConfirm={() => handleStatusChange(task.id, 'done')}
                    okText="Phê duyệt"
                    cancelText="Hủy"
                  >
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a',
                        color: '#fff',
                        borderRadius: 6,
                        boxShadow: '0 2px 8px rgba(82,196,26,0.15)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Phê duyệt
                    </Button>
                  </Popconfirm>
                </Tooltip>
              )}

              {/* Status tag for completed tasks */}
              {task.status === 'done' && (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Đã hoàn thành
                </Tag>
              )}
            </>
          );
        })()}
      </div>
    </Card>
    );
  };

  return (
    <div className="task-board">
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
          <Button
            type={viewMode === 'me' ? 'default' : 'primary'}
            icon={<TeamOutlined />}
            onClick={handleToggleViewMode}
            loading={loading}
            disabled={viewMode === 'all'}
            style={{ minWidth: 140 }}
          >
            Xem tất cả
          </Button>
          
          <Button
            type={viewMode === 'me' ? 'primary' : 'default'}
            icon={<UserOutlined />}
            onClick={handleToggleViewMode}
            loading={loading}
            disabled={viewMode === 'me'}
            style={{ minWidth: 140 }}
          >
            Công việc của tôi
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          { (projectManagerIdState && currentUserId && String(projectManagerIdState) === String(currentUserId)) ? (
            <>
              <Button
                type="primary"
                style={{backgroundColor:"#52c41a"}}
                onClick={() => setIsManualModalVisible(true)}
              >
                <PlusOutlined /> Tạo thủ công
              </Button>

              <Button
                icon={<FaMagic />}
                onClick={() => setIsAIModalVisible(true)}
                style={{
                  background: 'linear-gradient(90deg, #9871e8ff 0%, #0066ff 100%)',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(24,144,255,0.2)',
                  minWidth: 140
                }}
              >
                Tạo với AI
              </Button>
            </>
          ) : null}
        </div>
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
            name="start_date"
            label="Ngày bắt đầu"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
              allowClear
              disabledDate={(current) => {
                // Disable past dates
                if (current && current < dayjs().startOf('day')) return true;
                // Disable non-working days based on settings
                if (current && !isWorkingDay(current)) return true;
                return false;
              }}
              onChange={() => {
                // Trigger auto-calculation when dates change
                const startDate = form.getFieldValue('start_date');
                const dueDate = form.getFieldValue('due_date');
                if (startDate && dueDate) {
                  const days = Math.max(1, dueDate.diff(startDate, 'day'));
                  form.setFieldsValue({ estimatedDays: days });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="Hạn hoàn thành"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
              allowClear
              disabledDate={(current) => {
                const startDate = form.getFieldValue('start_date');
                // Disable dates before or equal to start_date
                if (current && startDate && current <= startDate) return true;
                // Disable non-working days based on settings
                if (current && !isWorkingDay(current)) return true;
                return false;
              }}
              onChange={() => {
                // Trigger auto-calculation when dates change
                const startDate = form.getFieldValue('start_date');
                const dueDate = form.getFieldValue('due_date');
                if (startDate && dueDate) {
                  const days = Math.max(1, dueDate.diff(startDate, 'day'));
                  form.setFieldsValue({ estimatedDays: days });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="estimatedDays"
            label={
              <span>
                Thời gian ước tính (ngày)
                <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
                  (Tự động tính từ ngày bắt đầu → deadline)
                </span>
              </span>
            }
          >
            <Input
              type="number"
              placeholder="Tự động tính"
              disabled
              style={{ backgroundColor: '#f5f5f5' }}
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

      {/* Manual Task Creation Modal */}
      <Modal
        title="Tạo task thủ công"
        open={isManualModalVisible}
        onCancel={() => {
          setIsManualModalVisible(false);
          manualForm.resetFields();
        }}
        onOk={handleManualTaskCreate}
        okText="Tạo task"
        cancelText="Hủy"
        width={600}
      >
        <Form form={manualForm} layout="vertical">
          <Form.Item
            name="title"
            label="Tiêu đề task"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
          >
            <Input placeholder="Nhập tiêu đề task" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
          >
            <TextArea rows={4} placeholder="Nhập mô tả chi tiết" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Mức độ ưu tiên"
            rules={[{ required: true, message: 'Vui lòng chọn mức độ ưu tiên!' }]}
            initialValue="medium"
          >
            <Select>
              <Option value="low">
                <Tag color="blue">Thấp</Tag>
              </Option>
              <Option value="medium">
                <Tag color="orange">Trung bình</Tag>
              </Option>
              <Option value="high">
                <Tag color="red">Cao</Tag>
              </Option>
              <Option value="urgent">
                <Tag color="volcano">Khẩn cấp</Tag>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="assigneeId"
            label="Người thực hiện"
            rules={[{ required: true, message: 'Vui lòng chọn người thực hiện!' }]}
          >
            <Select placeholder="Chọn người thực hiện">
              {members.map((member) => (
                <Option key={member.id} value={member.id}>
                  {member.name || member.email}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="start_date"
            label="Ngày bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu!' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày bắt đầu"
              disabledDate={(current) => {
                if (current && current < dayjs().startOf('day')) return true;
                if (current && !isWorkingDay(current)) return true;
                return false;
              }}
              onChange={() => {
                // Auto-calculate estimated days
                const startDate = manualForm.getFieldValue('start_date');
                const dueDate = manualForm.getFieldValue('due_date');
                if (startDate && dueDate) {
                  const days = Math.max(1, dueDate.diff(startDate, 'day'));
                  manualForm.setFieldsValue({ estimatedDays: days });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="Hạn hoàn thành"
            rules={[
              { required: true, message: 'Vui lòng chọn hạn hoàn thành!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const startDate = getFieldValue('start_date');
                  if (!value || !startDate || value.isAfter(startDate)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Hạn hoàn thành phải sau ngày bắt đầu!'));
                },
              }),
            ]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn hạn hoàn thành"
              disabledDate={(current) => {
                const startDate = manualForm.getFieldValue('start_date');
                if (current && startDate && current <= startDate) return true;
                if (current && !isWorkingDay(current)) return true;
                return false;
              }}
              onChange={() => {
                // Auto-calculate estimated days
                const startDate = manualForm.getFieldValue('start_date');
                const dueDate = manualForm.getFieldValue('due_date');
                if (startDate && dueDate) {
                  const days = Math.max(1, dueDate.diff(startDate, 'day'));
                  manualForm.setFieldsValue({ estimatedDays: days });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="estimatedDays"
            label={
              <span>
                Thời gian ước tính (ngày)
                <span style={{ color: '#999', fontSize: 12, marginLeft: 8 }}>
                  (Tự động tính)
                </span>
              </span>
            }
          >
            <Input
              type="number"
              placeholder="Tự động tính từ ngày bắt đầu → deadline"
              disabled
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskBoard;
