import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import {
  Surface,
  Chip,
  Avatar,
  ProgressBar,
  ActivityIndicator,
  Portal,
  Modal,
  Button,
  Divider,
  Card,
  FAB,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import JobService from '../../services/JobService';

const { width } = Dimensions.get('window');

const statusColors = {
  planning: '#1890ff',
  active: '#52c41a',
  on_hold: '#faad14',
  completed: '#722ed1',
  cancelled: '#ff4d4f'
};

const statusLabels = {
  planning: 'Đang lên kế hoạch',
  active: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const taskStatusColors = {
  todo: '#1890ff',
  in_progress: '#faad14',
  review: '#722ed1',
  done: '#52c41a'
};

const taskStatusLabels = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  review: 'Review',
  done: 'Hoàn thành'
};

const taskPriorityColors = {
  low: '#8c8c8c',
  medium: '#1890ff',
  high: '#faad14',
  urgent: '#ff4d4f'
};

const taskPriorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp'
};

const ProjectDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { projectId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  
  // Expenses state
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'other',
    description: '',
    expense_date: new Date(),
  });
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  
  // AI Create task states
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [aiStep, setAiStep] = useState(0); // 0: Input, 1: AI Analysis, 2: Select Candidate
  const [aiLoading, setAiLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    startDate: null,
    dueDate: null,
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        loadProjectData();
      }
    }, [projectId])
  );

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const [overviewRes, membersRes, tasksRes, statsRes] = await Promise.all([
        JobService.getProjectOverview(projectId),
        JobService.getProjectMembers(projectId).catch(() => ({ members: [] })),
        JobService.getProjectTasks(projectId).catch(() => ({ data: [] })),
        JobService.getProjectTaskStatistics(projectId).catch(() => null),
      ]);

  // DEBUG: print raw responses to help diagnose 'fake' data issues
  console.log('🔍 [ProjectDetail] overviewRes:', overviewRes);
  console.log('🔍 [ProjectDetail] membersRes:', membersRes);
  console.log('🔍 [ProjectDetail] tasksRes:', tasksRes);
  console.log('🔍 [ProjectDetail] statsRes:', statsRes);

  const projectData = overviewRes?.project ?? overviewRes?.data?.project ?? overviewRes;
      setProject(projectData);
      // Normalize members: API may return array directly, or under members or data
      const normalizedMembers = Array.isArray(membersRes?.members)
        ? membersRes.members
        : Array.isArray(membersRes?.data)
        ? membersRes.data
        : Array.isArray(membersRes)
        ? membersRes
        : membersRes?.data?.members ?? [];

      setMembers(normalizedMembers);
      setTasks(tasksRes?.data ?? tasksRes?.tasks ?? tasksRes ?? []);

      // Normalize statistics: job-service may return { statistics: {...}, charts: {...} } inside data
      const normalizedStats = statsRes?.data?.statistics ?? statsRes?.data ?? statsRes?.statistics ?? statsRes ?? null;
      setStatistics(normalizedStats);
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin dự án');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjectData();
    if (activeTab === 'expenses') loadExpenses();
  };

  const loadExpenses = async () => {
    setExpensesLoading(true);
    try {
      const response = await JobService.getProjectExpenses(projectId);
      const data = response?.data ?? response ?? [];
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!newExpense.title.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề chi phí');
      return;
    }
    if (!newExpense.amount || isNaN(parseFloat(newExpense.amount))) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setExpenseSubmitting(true);
    try {
      await JobService.createProjectExpense(projectId, {
        title: newExpense.title.trim(),
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description.trim(),
        expense_date: newExpense.expense_date.toISOString().split('T')[0],
      });
      Alert.alert('Thành công', 'Đã thêm chi phí');
      setExpenseModalVisible(false);
      setNewExpense({ title: '', amount: '', category: 'other', description: '', expense_date: new Date() });
      loadExpenses();
    } catch (error) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể thêm chi phí');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleApproveExpense = async (expenseId) => {
    try {
      await JobService.approveProjectExpense(expenseId);
      loadExpenses();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể duyệt chi phí');
    }
  };

  const handleRejectExpense = async (expenseId) => {
    try {
      await JobService.rejectProjectExpense(expenseId);
      loadExpenses();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể từ chối chi phí');
    }
  };

  useEffect(() => {
    if (activeTab === 'expenses' && projectId) {
      loadExpenses();
    }
  }, [activeTab]);

  const handleEditProject = () => {
    navigation.navigate('Sửa dự án', { projectId, project });
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await JobService.updateTaskStatus(projectId, taskId, newStatus);
      loadProjectData();
      setTaskModalVisible(false);
      Alert.alert('Thành công', 'Đã cập nhật trạng thái công việc');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  // Step 1: Analyze with AI
  const handleAnalyzeWithAI = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề công việc');
      return;
    }

    setAiLoading(true);
    try {
      const response = await JobService.analyzeJob({
        title: newTask.title,
        description: newTask.description,
        project_id: projectId,
        start_date: newTask.startDate ? newTask.startDate.toISOString().split('T')[0] : undefined,
        due_date: newTask.dueDate ? newTask.dueDate.toISOString().split('T')[0] : undefined,
      });

      if (response.success || response.data?.success) {
        const analysis = response.analysis || response.data?.analysis;
        setAiAnalysis(analysis);
        setAiStep(1);
      } else {
        throw new Error('Phân tích thất bại');
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể phân tích công việc');
    } finally {
      setAiLoading(false);
    }
  };

  // Step 2: Find Candidates
  const handleFindCandidates = async () => {
    if (!aiAnalysis) return;

    setAiLoading(true);
    try {
      const estHours = aiAnalysis.estimated_hours || 8;
      const startDate = newTask.startDate;
      const dueDate = newTask.dueDate;
      let computedDays = 1;
      
      if (startDate && dueDate) {
        const diffTime = dueDate.getTime() - startDate.getTime();
        computedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        computedDays = Math.max(1, Math.ceil(estHours / 8));
      }

      const response = await JobService.findCandidates({
        project_id: projectId,
        job_title: newTask.title,
        job_estimated_days: computedDays,
        job_estimated_hours: estHours,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        required_skills: (aiAnalysis.required_skills || []).map(skill => ({
          skill_id: skill.skill_id,
          proficiency_level: skill.required_level,
          importance: skill.importance,
        })),
        min_match_score: 0,
        max_results: 100,
        check_workload: true,
      });

      if (response.success || response.data?.success) {
        const suggested = response.suggested_candidates || response.data?.suggested_candidates || [];
        const allMembers = response.all_project_members || response.data?.all_project_members || [];
        setCandidates([...suggested, ...allMembers.filter(m => !suggested.find(s => s.user_id === m.user_id))]);
        setAiStep(2);
      } else {
        throw new Error('Tìm ứng viên thất bại');
      }
    } catch (error) {
      console.error('Find candidates error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tìm ứng viên');
    } finally {
      setAiLoading(false);
    }
  };

  // Step 3: Create task with selected candidate
  const handleCreateTaskWithAI = async () => {
    setAiLoading(true);
    try {
      const estHours = aiAnalysis?.estimated_hours || 8;
      const startDate = newTask.startDate;
      const dueDate = newTask.dueDate;
      let computedDays = 1;
      
      if (startDate && dueDate) {
        const diffTime = dueDate.getTime() - startDate.getTime();
        computedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        computedDays = Math.max(1, Math.ceil(estHours / 8));
      }

      const payload = {
        title: newTask.title,
        description: newTask.description,
        project_id: projectId,
        status: 'todo',
        priority: getDifficultyPriority(aiAnalysis?.difficulty_level),
        assigned_to_user_id: selectedCandidate,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        estimated_days: computedDays,
        estimated_hours: estHours,
        required_skills: aiAnalysis?.required_skills || [],
      };

      const response = await JobService.createJobWithAnalysis(payload);
      
      if (response.success || response.data?.success) {
        Alert.alert('Thành công', 'Đã tạo công việc với AI');
        closeAndResetModal();
        loadProjectData();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo công việc');
    } finally {
      setAiLoading(false);
    }
  };

  const getDifficultyPriority = (level) => {
    if (!level) return 'medium';
    if (level <= 2) return 'low';
    if (level <= 3) return 'medium';
    if (level <= 4) return 'high';
    return 'urgent';
  };

  const closeAndResetModal = () => {
    setCreateTaskModalVisible(false);
    setAiStep(0);
    setAiAnalysis(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setNewTask({
      title: '',
      description: '',
      startDate: null,
      dueDate: null,
    });
  };

  const handleDeleteTask = async (taskId) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa công việc này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await JobService.deleteTask(projectId, taskId);
              loadProjectData();
              setTaskModalVisible(false);
              Alert.alert('Thành công', 'Đã xóa công việc');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa công việc');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer} contentContainerStyle={styles.tabContentContainer}>
      {['overview', 'tasks', 'members', 'statistics', 'expenses'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'overview' && 'Tổng quan'}
            {tab === 'tasks' && 'Công việc'}
            {tab === 'members' && 'Thành viên'}
            {tab === 'statistics' && 'Thống kê'}
            {tab === 'expenses' && 'Chi phí'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderOverview = () => {
    if (!project) return null;
    const statusColor = statusColors[project.status] || '#1890ff';
    const statusLabel = statusLabels[project.status] || project.status;

    return (
      <View style={styles.overviewContainer}>
        {/* Project Header Card */}
        <Surface style={styles.headerCard} elevation={2}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <Text style={styles.projectId}>{project.project_id || project.id}</Text>
              <Text style={styles.projectName}>{project.name}</Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}
              textStyle={{ color: statusColor, fontSize: 12 }}
            >
              {statusLabel}
            </Chip>
          </View>
          
          {project.description && (
            <Text style={styles.description}>{project.description}</Text>
          )}

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Tiến độ dự án</Text>
              <Text style={[styles.progressValue, { color: statusColor }]}>
                {project.progress || 0}%
              </Text>
            </View>
            <ProgressBar 
              progress={(project.progress || 0) / 100} 
              color={statusColor} 
              style={styles.progressBar}
            />
          </View>
        </Surface>

        {/* Details Card */}
        <Surface style={styles.detailsCard} elevation={2}>
          <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar-start" size={18} color="#1890ff" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ngày bắt đầu</Text>
                <Text style={styles.detailValue}>{formatDate(project.start_date || project.startDate)}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar-end" size={18} color="#ff4d4f" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ngày kết thúc</Text>
                <Text style={styles.detailValue}>{formatDate(project.end_date || project.endDate)}</Text>
              </View>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="cash" size={18} color="#52c41a" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ngân sách</Text>
                <Text style={styles.detailValue}>{formatCurrency(project.budget)}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="cash-minus" size={18} color="#faad14" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Đã chi</Text>
                <Text style={[styles.detailValue, { 
                  color: (project.spent || 0) > (project.budget || 0) ? '#ff4d4f' : '#52c41a' 
                }]}>
                  {formatCurrency(project.spent)}
                </Text>
              </View>
            </View>
          </View>

          {project.customer && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.singleDetailItem}>
                <MaterialCommunityIcons name="account-circle" size={18} color="#722ed1" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Khách hàng</Text>
                  <Text style={styles.detailValue}>{project.customer}</Text>
                </View>
              </View>
            </>
          )}
        </Surface>

        {/* Manager Card */}
        <Surface style={styles.managerCard} elevation={2}>
          <Text style={styles.sectionTitle}>Quản lý dự án</Text>
          <View style={styles.managerInfo}>
            <Avatar.Text 
              size={48} 
              label={getInitials(project.manager_id?.fullName || project.manager?.name || '')}
              style={styles.managerAvatar}
            />
            <View style={styles.managerDetails}>
              <Text style={styles.managerName}>
                {project.manager_id?.fullName || project.manager?.name || 'Chưa có quản lý'}
              </Text>
              <Text style={styles.managerRole}>Project Manager</Text>
            </View>
          </View>
        </Surface>
      </View>
    );
  };

  const renderTasks = () => (
    <View style={styles.tasksContainer}>
      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#d9d9d9" />
          <Text style={styles.emptyText}>Chưa có công việc nào</Text>
        </View>
      ) : (
        tasks.map((task) => {
          const statusColor = taskStatusColors[task.status] || '#1890ff';
          const statusLabel = taskStatusLabels[task.status] || task.status;
          const priorityColor = taskPriorityColors[task.priority] || '#1890ff';
          const priorityLabel = taskPriorityLabels[task.priority] || task.priority;

          return (
            <TouchableOpacity
              key={task.id || task.task_id}
              onPress={() => {
                setSelectedTask(task);
                setTaskModalVisible(true);
              }}
            >
              <Surface style={styles.taskCard} elevation={1}>
                {/* Title row */}
                <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                
                {/* Status and Priority chips */}
                <View style={styles.taskChipsRow}>
                  <Chip
                    style={[styles.statusChipSmall, { backgroundColor: statusColor + '20' }]}
                    textStyle={{ color: statusColor, fontSize: 11 }}
                    compact
                  >
                    {statusLabel}
                  </Chip>
                  <Chip
                    style={[styles.priorityChip, { backgroundColor: priorityColor + '20' }]}
                    textStyle={{ color: priorityColor, fontSize: 11 }}
                    compact
                  >
                    {priorityLabel}
                  </Chip>
                </View>

                {/* Due date */}
                {task.due_date && (
                  <View style={styles.taskDueDate}>
                    <MaterialCommunityIcons name="calendar" size={14} color="#8c8c8c" />
                    <Text style={styles.dueDateText}>{formatDate(task.due_date)}</Text>
                  </View>
                )}

                {task.assignee && (
                  <View style={styles.taskAssignee}>
                    <Avatar.Text 
                      size={20} 
                      label={getInitials(task.assignee?.name || task.assignee?.fullName || '')}
                      style={styles.assigneeAvatar}
                    />
                    <Text style={styles.assigneeName} numberOfLines={1}>
                      {task.assignee?.name || task.assignee?.fullName || ''}
                    </Text>
                  </View>
                )}
              </Surface>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const renderMembers = () => (
    <View style={styles.membersContainer}>
      {members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-group-outline" size={64} color="#d9d9d9" />
          <Text style={styles.emptyText}>Chưa có thành viên</Text>
        </View>
      ) : (
        members.map((member, index) => {
          // member.user_id can be either an object (user details) or a numeric id.
          // If it's an object, use it; otherwise use the member object itself which may include fullName/email.
          const user = (member && typeof member.user_id === 'object' && member.user_id !== null) ? member.user_id : member;
          const name = user?.fullName ?? user?.name ?? user?.username ?? `User ${user?.id ?? index}`;
          const role = member.role || user?.chevron?.name || user?.position || '';

          return (
            <Surface key={user?.id || index} style={styles.memberCard} elevation={1}>
              <Avatar.Text 
                size={48} 
                label={getInitials(name)}
                style={styles.memberAvatar}
              />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{name}</Text>
                {role && <Text style={styles.memberRole}>{role}</Text>}
                {member.joined_at && (
                  <Text style={styles.memberJoined}>
                    Tham gia: {formatDate(member.joined_at)}
                  </Text>
                )}
              </View>
            </Surface>
          );
        })
  )}

      
    </View>
  );

  const renderStatistics = () => {
    if (!statistics) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="chart-bar" size={64} color="#d9d9d9" />
          <Text style={styles.emptyText}>Chưa có thống kê</Text>
        </View>
      );
    }

    // Normalize various possible API response shapes into a common structure
    const totalTasks = statistics.total_tasks ?? statistics.totalTasks ?? 0;
    const completedTasks = (statistics.by_status && (statistics.by_status.done ?? statistics.by_status.completed)) ?? statistics.completedTasks ?? 0;

    // tasksByStatus: prefer by_status object, otherwise read from charts.status_chart
    const tasksByStatus = {};
    if (statistics.by_status && typeof statistics.by_status === 'object') {
      Object.assign(tasksByStatus, statistics.by_status);
    } else if (statistics.charts && Array.isArray(statistics.charts.status_chart)) {
      statistics.charts.status_chart.forEach((s) => {
        if (s && s.status) tasksByStatus[s.status] = s.value ?? 0;
      });
    }

    // tasksByPriority: prefer by_priority, otherwise charts.priority_chart
    const tasksByPriority = {};
    if (statistics.by_priority && typeof statistics.by_priority === 'object') {
      Object.assign(tasksByPriority, statistics.by_priority);
    } else if (statistics.charts && Array.isArray(statistics.charts.priority_chart)) {
      statistics.charts.priority_chart.forEach((p) => {
        if (p && p.priority) tasksByPriority[p.priority] = p.value ?? 0;
      });
    }

    return (
      <View style={styles.statisticsContainer}>
        {/* Overall Stats */}
        <Surface style={styles.statsCard} elevation={2}>
          <Text style={styles.sectionTitle}>Tổng quan công việc</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalTasks || 0}</Text>
              <Text style={styles.statLabel}>Tổng</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#52c41a' }]}>{completedTasks || 0}</Text>
              <Text style={styles.statLabel}>Hoàn thành</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#1890ff' }]}>
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Tỷ lệ</Text>
            </View>
          </View>
        </Surface>

        {/* Status Breakdown */}
        <Surface style={styles.statsCard} elevation={2}>
          <Text style={styles.sectionTitle}>Theo trạng thái</Text>
          {/* Simple bar chart (horizontal bars) */}
          {(() => {
            const totalForStatus = Object.values(tasksByStatus).reduce((s, v) => s + (Number(v) || 0), 0) || totalTasks || 0;
            return Object.entries(taskStatusLabels).map(([key, label]) => {
              const count = Number(tasksByStatus[key] ?? 0) || 0;
              const percent = totalForStatus > 0 ? (count / totalForStatus) : 0;
              return (
                <View key={key} style={styles.statRow}>
                  <View style={styles.statRowLeft}>
                    <View style={[styles.statusDot, { backgroundColor: taskStatusColors[key] }]} />
                    <Text style={styles.statRowLabel}>{label}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                    <View style={styles.barBackground}>
                      <View style={[styles.barInner, { width: `${Math.round(percent * 100)}%`, backgroundColor: taskStatusColors[key] }]} />
                    </View>
                  </View>
                  <Text style={styles.statRowValue}>{count}</Text>
                </View>
              );
            });
          })()}
        </Surface>

        {/* Priority Breakdown */}
        <Surface style={styles.statsCard} elevation={2}>
          <Text style={styles.sectionTitle}>Theo độ ưu tiên</Text>
          {(() => {
            const totalForPriority = Object.values(tasksByPriority).reduce((s, v) => s + (Number(v) || 0), 0) || totalTasks || 0;
            return Object.entries(taskPriorityLabels).map(([key, label]) => {
              const count = Number(tasksByPriority[key] ?? 0) || 0;
              const percent = totalForPriority > 0 ? (count / totalForPriority) : 0;
              return (
                <View key={key} style={styles.statRow}>
                  <View style={styles.statRowLeft}>
                    <View style={[styles.statusDot, { backgroundColor: taskPriorityColors[key] }]} />
                    <Text style={styles.statRowLabel}>{label}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                    <View style={styles.barBackground}>
                      <View style={[styles.barInner, { width: `${Math.round(percent * 100)}%`, backgroundColor: taskPriorityColors[key] }]} />
                    </View>
                  </View>
                  <Text style={styles.statRowValue}>{count}</Text>
                </View>
              );
            });
          })()}
        </Surface>
      </View>
    );
  };

  const renderExpenses = () => {
    const EXPENSE_CATEGORIES = {
      personnel: { label: 'Nhân sự', icon: 'account-group', color: '#1890ff' },
      equipment: { label: 'Thiết bị', icon: 'wrench', color: '#faad14' },
      software: { label: 'Phần mềm', icon: 'laptop', color: '#722ed1' },
      office: { label: 'Văn phòng', icon: 'office-building', color: '#13c2c2' },
      travel: { label: 'Di chuyển', icon: 'car', color: '#52c41a' },
      other: { label: 'Khác', icon: 'dots-horizontal', color: '#8c8c8c' },
    };
    const EXPENSE_STATUS = {
      pending: { label: 'Chờ duyệt', color: '#faad14', bg: '#fffbe6' },
      approved: { label: 'Đã duyệt', color: '#52c41a', bg: '#f6ffed' },
      rejected: { label: 'Từ chối', color: '#ff4d4f', bg: '#fff2f0' },
    };

    return (
      <View style={{ flex: 1 }}>
        {expensesLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#1890ff" />
        ) : expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-remove" size={48} color="#bfbfbf" />
            <Text style={styles.emptyText}>Chưa có chi phí nào</Text>
          </View>
        ) : (
          expenses.map((expense) => {
            const cat = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES.other;
            const st = EXPENSE_STATUS[expense.status] || EXPENSE_STATUS.pending;
            return (
              <Surface key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                  <View style={[styles.expenseCatIcon, { backgroundColor: cat.color + '20' }]}>
                    <MaterialCommunityIcons name={cat.icon} size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.expenseTitle}>{expense.title}</Text>
                    <Text style={styles.expenseCatLabel}>{cat.label}</Text>
                  </View>
                  <View>
                    <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                    <View style={[styles.expenseStatusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.expenseStatusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>
                {expense.description ? (
                  <Text style={styles.expenseDesc}>{expense.description}</Text>
                ) : null}
                <View style={styles.expenseFooter}>
                  <MaterialCommunityIcons name="calendar" size={12} color="#8c8c8c" />
                  <Text style={styles.expenseDate}>{formatDate(expense.expense_date)}</Text>
                </View>
                {expense.status === 'pending' && (
                  <View style={styles.expenseActions}>
                    <TouchableOpacity
                      style={[styles.expenseActionBtn, { backgroundColor: '#f6ffed', borderColor: '#52c41a' }]}
                      onPress={() => handleApproveExpense(expense.id)}
                    >
                      <MaterialCommunityIcons name="check" size={14} color="#52c41a" />
                      <Text style={[styles.expenseActionText, { color: '#52c41a' }]}>Duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.expenseActionBtn, { backgroundColor: '#fff2f0', borderColor: '#ff4d4f' }]}
                      onPress={() => handleRejectExpense(expense.id)}
                    >
                      <MaterialCommunityIcons name="close" size={14} color="#ff4d4f" />
                      <Text style={[styles.expenseActionText, { color: '#ff4d4f' }]}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Surface>
            );
          })
        )}

        {/* Expense Modal */}
        <Portal>
          <Modal
            visible={expenseModalVisible}
            onDismiss={() => setExpenseModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm chi phí</Text>
              <TouchableOpacity onPress={() => setExpenseModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#8c8c8c" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.fieldLabel}>Tiêu đề *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập tiêu đề chi phí"
                value={newExpense.title}
                onChangeText={(v) => setNewExpense(p => ({ ...p, title: v }))}
              />
              <Text style={styles.fieldLabel}>Số tiền (VND) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                keyboardType="numeric"
                value={newExpense.amount}
                onChangeText={(v) => setNewExpense(p => ({ ...p, amount: v }))}
              />
              <Text style={styles.fieldLabel}>Danh mục</Text>
              <View style={styles.categoryGrid}>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryBtn,
                      newExpense.category === key && { backgroundColor: val.color, borderColor: val.color },
                    ]}
                    onPress={() => setNewExpense(p => ({ ...p, category: key }))}
                  >
                    <MaterialCommunityIcons
                      name={val.icon}
                      size={14}
                      color={newExpense.category === key ? '#fff' : val.color}
                    />
                    <Text style={[
                      styles.categoryBtnText,
                      newExpense.category === key && { color: '#fff' },
                    ]}>{val.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Ngày chi</Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowExpenseDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={16} color="#1890ff" />
                <Text style={styles.datePickerText}>{formatDate(newExpense.expense_date)}</Text>
              </TouchableOpacity>
              {showExpenseDatePicker && (
                <DateTimePicker
                  value={newExpense.expense_date}
                  mode="date"
                  onChange={(e, date) => {
                    setShowExpenseDatePicker(false);
                    if (date) setNewExpense(p => ({ ...p, expense_date: date }));
                  }}
                />
              )}
              <Text style={styles.fieldLabel}>Mô tả</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Mô tả chi tiết..."
                multiline
                value={newExpense.description}
                onChangeText={(v) => setNewExpense(p => ({ ...p, description: v }))}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setExpenseModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, expenseSubmitting && { opacity: 0.6 }]}
                onPress={handleCreateExpense}
                disabled={expenseSubmitting}
              >
                <Text style={styles.submitBtnText}>{expenseSubmitting ? 'Đang lưu...' : 'Thêm'}</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </Portal>

      </View>
    );
  };

  const renderTaskModal = () => {
    if (!selectedTask) return null;
    
    const statusColor = taskStatusColors[selectedTask.status] || '#1890ff';
    const statusLabel = taskStatusLabels[selectedTask.status] || selectedTask.status;

    return (
      <Portal>
        <Modal
          visible={taskModalVisible}
          onDismiss={() => setTaskModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết công việc</Text>
            <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#8c8c8c" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.taskDetailTitle}>{selectedTask.title}</Text>
            
            {selectedTask.description && (
              <Text style={styles.taskDetailDesc}>{selectedTask.description}</Text>
            )}

            <View style={styles.taskDetailRow}>
              <Text style={styles.taskDetailLabel}>Trạng thái:</Text>
              <Chip
                style={[styles.statusChipSmall, { backgroundColor: statusColor + '20' }]}
                textStyle={{ color: statusColor, fontSize: 11 }}
              >
                {statusLabel}
              </Chip>
            </View>

            {selectedTask.due_date && (
              <View style={styles.taskDetailRow}>
                <Text style={styles.taskDetailLabel}>Hạn:</Text>
                <Text style={styles.taskDetailValue}>{formatDate(selectedTask.due_date)}</Text>
              </View>
            )}

            <Divider style={styles.divider} />

            <Text style={styles.updateStatusTitle}>Cập nhật trạng thái</Text>
            <View style={styles.statusButtons}>
              {Object.entries(taskStatusLabels).map(([key, label]) => (
                <Button
                  key={key}
                  mode={selectedTask.status === key ? 'contained' : 'outlined'}
                  onPress={() => handleUpdateTaskStatus(selectedTask.id || selectedTask.task_id, key)}
                  style={[styles.statusButton, { borderColor: taskStatusColors[key] }]}
                  buttonColor={selectedTask.status === key ? taskStatusColors[key] : 'transparent'}
                  textColor={selectedTask.status === key ? '#fff' : taskStatusColors[key]}
                  compact
                >
                  {label}
                </Button>
              ))}
            </View>

            {/* Delete button - only for todo tasks */}
            {selectedTask.status === 'todo' && (
              <>
                <Divider style={styles.divider} />
                <Button
                  mode="outlined"
                  icon="delete"
                  textColor="#ff4d4f"
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTask(selectedTask.id || selectedTask.task_id)}
                >
                  Xóa công việc
                </Button>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    );
  };

  const renderCreateTaskModal = () => {
    const difficultyColors = ['#52c41a', '#73d13d', '#faad14', '#ff7a45', '#ff4d4f'];
    const difficultyLabels = ['Rất dễ', 'Dễ', 'Trung bình', 'Khó', 'Rất khó'];

    const getStepTitle = () => {
      switch (aiStep) {
        case 0: return 'Bước 1: Nhập thông tin';
        case 1: return 'Bước 2: Kết quả AI';
        case 2: return 'Bước 3: Chọn người thực hiện';
        default: return 'Tạo công việc với AI';
      }
    };

    return (
      <Portal>
        <Modal
          visible={createTaskModalVisible}
          onDismiss={closeAndResetModal}
          contentContainerStyle={styles.createModalContainer}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              {aiStep > 0 && (
                <TouchableOpacity onPress={() => setAiStep(aiStep - 1)} style={styles.backButton}>
                  <MaterialCommunityIcons name="arrow-left" size={24} color="#1890ff" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>{getStepTitle()}</Text>
            </View>
            <TouchableOpacity onPress={closeAndResetModal}>
              <MaterialCommunityIcons name="close" size={24} color="#8c8c8c" />
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {[0, 1, 2].map((step) => (
              <View key={step} style={styles.stepRow}>
                <View style={[
                  styles.stepDot,
                  { backgroundColor: aiStep >= step ? '#1890ff' : '#d9d9d9' }
                ]}>
                  <Text style={styles.stepDotText}>{step + 1}</Text>
                </View>
                {step < 2 && (
                  <View style={[
                    styles.stepLine,
                    { backgroundColor: aiStep > step ? '#1890ff' : '#d9d9d9' }
                  ]} />
                )}
              </View>
            ))}
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Step 0: Input */}
            {aiStep === 0 && (
              <>
                <Text style={styles.inputLabel}>Tiêu đề công việc *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: Thiết kế giao diện đăng nhập"
                  value={newTask.title}
                  onChangeText={(text) => setNewTask({ ...newTask, title: text })}
                />

                <Text style={styles.inputLabel}>Mô tả chi tiết</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputMultiline]}
                  placeholder="Mô tả yêu cầu, kỹ năng cần thiết..."
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({ ...newTask, description: text })}
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.inputLabel}>Ngày bắt đầu</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {newTask.startDate ? formatDate(newTask.startDate) : 'Chọn ngày bắt đầu'}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={20} color="#8c8c8c" />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Ngày hết hạn</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {newTask.dueDate ? formatDate(newTask.dueDate) : 'Chọn ngày hết hạn'}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={20} color="#8c8c8c" />
                </TouchableOpacity>
              </>
            )}

            {/* Step 1: AI Analysis Result */}
            {aiStep === 1 && aiAnalysis && (
              <>
                <Surface style={styles.aiResultCard} elevation={1}>
                  <View style={styles.aiResultHeader}>
                    <MaterialCommunityIcons name="robot" size={24} color="#1890ff" />
                    <Text style={styles.aiResultTitle}>Kết quả phân tích AI</Text>
                  </View>
                  
                  <View style={styles.aiResultRow}>
                    <Text style={styles.aiResultLabel}>Độ khó:</Text>
                    <Chip 
                      style={{ backgroundColor: (difficultyColors[aiAnalysis.difficulty_level - 1] || '#1890ff') + '20' }}
                      textStyle={{ color: difficultyColors[aiAnalysis.difficulty_level - 1] || '#1890ff' }}
                    >
                      {difficultyLabels[aiAnalysis.difficulty_level - 1] || 'Trung bình'}
                    </Chip>
                  </View>

                  <View style={styles.aiResultRow}>
                    <Text style={styles.aiResultLabel}>Thời gian ước tính:</Text>
                    <Text style={styles.aiResultValue}>{aiAnalysis.estimated_hours || 8} giờ</Text>
                  </View>

                  {aiAnalysis.summary && (
                    <View style={styles.aiSummaryBox}>
                      <Text style={styles.aiSummaryTitle}>Tóm tắt</Text>
                      <Text style={styles.aiSummaryText}>{aiAnalysis.summary}</Text>
                    </View>
                  )}

                  {aiAnalysis.required_skills?.length > 0 && (
                    <View style={styles.skillsSection}>
                      <Text style={styles.skillsTitle}>Kỹ năng yêu cầu</Text>
                      <View style={styles.skillsContainer}>
                        {aiAnalysis.required_skills.map((skill, index) => (
                          <Chip 
                            key={index} 
                            style={styles.skillChip}
                            textStyle={styles.skillChipText}
                          >
                            {skill.skill_name}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}

                  {aiAnalysis.recommendations?.length > 0 && (
                    <View style={styles.recommendationsSection}>
                      <Text style={styles.recommendationsTitle}>Gợi ý</Text>
                      {aiAnalysis.recommendations.map((rec, index) => (
                        <View key={index} style={styles.recommendationItem}>
                          <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#faad14" />
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Surface>
              </>
            )}

            {/* Step 2: Select Candidate */}
            {aiStep === 2 && (
              <>
                <Text style={styles.sectionSubtitle}>
                  AI đề xuất người phù hợp dựa trên kỹ năng và khối lượng công việc
                </Text>

                {candidates.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-search" size={48} color="#d9d9d9" />
                    <Text style={styles.emptyText}>Không tìm thấy ứng viên phù hợp</Text>
                  </View>
                ) : (
                  candidates.map((candidate) => {
                    const isSelected = selectedCandidate === candidate.user_id;
                    const matchScore = candidate.match_score || 0;
                    const scoreColor = matchScore >= 70 ? '#52c41a' : matchScore >= 40 ? '#faad14' : '#ff4d4f';

                    return (
                      <TouchableOpacity
                        key={candidate.user_id}
                        onPress={() => setSelectedCandidate(candidate.user_id)}
                      >
                        <Surface 
                          style={[
                            styles.candidateCard,
                            isSelected && styles.candidateCardSelected
                          ]} 
                          elevation={isSelected ? 2 : 1}
                        >
                          <View style={styles.candidateHeader}>
                            <View style={styles.candidateInfo}>
                              <Avatar.Text 
                                size={40} 
                                label={getInitials(candidate.fullName || '')}
                                style={styles.candidateAvatar}
                              />
                              <View style={styles.candidateDetails}>
                                <Text style={styles.candidateName}>{candidate.fullName || 'Unknown'}</Text>
                                <Text style={styles.candidateEmail}>{candidate.email || ''}</Text>
                              </View>
                            </View>
                            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                              <Text style={[styles.scoreText, { color: scoreColor }]}>{matchScore}%</Text>
                            </View>
                          </View>

                          {candidate.overall_assessment && (
                            <Text style={styles.candidateAssessment}>{candidate.overall_assessment}</Text>
                          )}

                          {candidate.matched_skills?.length > 0 && (
                            <View style={styles.matchedSkillsRow}>
                              {candidate.matched_skills.slice(0, 3).map((skill, idx) => (
                                <Chip 
                                  key={idx} 
                                  style={[styles.matchedSkillChip, { 
                                    backgroundColor: skill.is_match ? '#52c41a20' : '#ff4d4f20' 
                                  }]}
                                  textStyle={{ 
                                    fontSize: 10, 
                                    color: skill.is_match ? '#52c41a' : '#ff4d4f' 
                                  }}
                                >
                                  {skill.skill_name}
                                </Chip>
                              ))}
                              {candidate.matched_skills.length > 3 && (
                                <Text style={styles.moreSkills}>+{candidate.matched_skills.length - 3}</Text>
                              )}
                            </View>
                          )}

                          {isSelected && (
                            <View style={styles.selectedBadge}>
                              <MaterialCommunityIcons name="check-circle" size={20} color="#1890ff" />
                              <Text style={styles.selectedText}>Đã chọn</Text>
                            </View>
                          )}
                        </Surface>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {aiStep === 0 && (
              <>
                <Button
                  mode="outlined"
                  onPress={closeAndResetModal}
                  style={styles.modalButton}
                >
                  Hủy
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAnalyzeWithAI}
                  loading={aiLoading}
                  disabled={aiLoading || !newTask.title.trim()}
                  style={styles.modalButton}
                  icon="robot"
                >
                  Phân tích AI
                </Button>
              </>
            )}

            {aiStep === 1 && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => setAiStep(0)}
                  style={styles.modalButton}
                >
                  Quay lại
                </Button>
                <Button
                  mode="contained"
                  onPress={handleFindCandidates}
                  loading={aiLoading}
                  disabled={aiLoading}
                  style={styles.modalButton}
                  icon="account-search"
                >
                  Tìm ứng viên
                </Button>
              </>
            )}

            {aiStep === 2 && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => setAiStep(1)}
                  style={styles.modalButton}
                >
                  Quay lại
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreateTaskWithAI}
                  loading={aiLoading}
                  disabled={aiLoading}
                  style={styles.modalButton}
                  icon="check"
                >
                  Tạo công việc
                </Button>
              </>
            )}
          </View>
        </Modal>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={newTask.startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setNewTask({ ...newTask, startDate: selectedDate });
              }
            }}
          />
        )}

        {showDueDatePicker && (
          <DateTimePicker
            value={newTask.dueDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDueDatePicker(false);
              if (selectedDate) {
                setNewTask({ ...newTask, dueDate: selectedDate });
              }
            }}
          />
        )}
      </Portal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <Text style={styles.loadingText}>Đang tải dự án...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="folder-alert-outline" size={64} color="#d9d9d9" />
        <Text style={styles.emptyText}>Không tìm thấy dự án</Text>
        <Button mode="contained" onPress={() => navigation.navigate('Dự án')}>
          Quay lại
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1890ff']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabs()}
        
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'statistics' && renderStatistics()}
        {activeTab === 'expenses' && renderExpenses()}
        
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB - context-dependent */}
      {activeTab === 'expenses' ? (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setExpenseModalVisible(true)}
          label="Thêm chi phí"
          color="#fff"
        />
      ) : (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setCreateTaskModalVisible(true)}
          color="#fff"
        />
      )}

      {renderTaskModal()}
      {renderCreateTaskModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#8c8c8c',
    fontSize: 14,
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  tabContentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1890ff',
  },
  tabText: {
    fontSize: 13,
    color: '#8c8c8c',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1890ff',
  },
  overviewContainer: {
    padding: 16,
  },
  headerCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectId: {
    fontSize: 11,
    color: '#8c8c8c',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#262626',
  },
  statusChip: {
    height: 28,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  singleDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailContent: {
    marginLeft: 10,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '500',
  },
  divider: {
    marginVertical: 12,
  },
  managerCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  managerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managerAvatar: {
    backgroundColor: '#1890ff',
  },
  managerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  managerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  managerRole: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 2,
  },
  tasksContainer: {
    padding: 16,
  },
  taskCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  priorityChip: {
    height: 24,
  },
  statusChipSmall: {
    height: 24,
  },
  taskDueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  dueDateText: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  taskAssignee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  assigneeAvatar: {
    backgroundColor: '#722ed1',
  },
  assigneeName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  membersContainer: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  memberAvatar: {
    backgroundColor: '#1890ff',
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#262626',
  },
  memberRole: {
    fontSize: 13,
    color: '#1890ff',
    marginTop: 2,
  },
  memberJoined: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 2,
  },
  statisticsContainer: {
    padding: 16,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
  },
  statLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statRowLabel: {
    fontSize: 14,
    color: '#262626',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  barBackground: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#8c8c8c',
    marginTop: 16,
    marginBottom: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1890ff',
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
  },
  modalContent: {
    padding: 16,
  },
  taskDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  taskDetailDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  taskDetailLabel: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  taskDetailValue: {
    fontSize: 14,
    color: '#262626',
  },
  updateStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    marginBottom: 8,
  },
  deleteButton: {
    borderColor: '#ff4d4f',
  },
  createModalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '85%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#262626',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#262626',
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  modalButton: {
    minWidth: 100,
  },
  // AI Modal styles
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  aiResultCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  aiResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1890ff',
  },
  aiResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiResultLabel: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  aiResultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  aiSummaryBox: {
    backgroundColor: '#f5f7fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  aiSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  aiSummaryText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  skillsSection: {
    marginTop: 16,
  },
  skillsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: '#e6f7ff',
  },
  skillChipText: {
    fontSize: 12,
    color: '#1890ff',
  },
  recommendationsSection: {
    marginTop: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 16,
    textAlign: 'center',
  },
  candidateCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  candidateCardSelected: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candidateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  candidateAvatar: {
    backgroundColor: '#1890ff',
  },
  candidateDetails: {
    marginLeft: 12,
    flex: 1,
  },
  candidateName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
  },
  candidateEmail: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  candidateAssessment: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  matchedSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  matchedSkillChip: {
    height: 24,
  },
  moreSkills: {
    fontSize: 11,
    color: '#8c8c8c',
    alignSelf: 'center',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  selectedText: {
    fontSize: 13,
    color: '#1890ff',
    fontWeight: '500',
  },
  // Expense styles
  expenseCard: {
    margin: 12,
    marginBottom: 4,
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fff',
    elevation: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseCatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  expenseCatLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1890ff',
    textAlign: 'right',
  },
  expenseStatusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  expenseStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expenseDesc: {
    fontSize: 12,
    color: '#595959',
    marginTop: 8,
  },
  expenseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  expenseDate: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  expenseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  expenseActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  expenseActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#fafafa',
  },
  categoryBtnText: {
    fontSize: 11,
    color: '#595959',
  },
});

export default ProjectDetailScreen;
