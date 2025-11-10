import { Project, ProjectMember, Task, ProjectStatistics, TimelineEvent } from '@/types/project';

// Mock Members
export const mockMembers: ProjectMember[] = [
  {
    id: 1,
    name: 'Nguyễn Văn An',
    role: 'Project Manager',
    email: 'an.nguyen@company.com',
    avatar: 'https://i.pravatar.cc/150?img=1'
  },
  {
    id: 2,
    name: 'Trần Thị Bình',
    role: 'Developer',
    email: 'binh.tran@company.com',
    avatar: 'https://i.pravatar.cc/150?img=2'
  },
  {
    id: 3,
    name: 'Lê Văn Cường',
    role: 'Developer',
    email: 'cuong.le@company.com',
    avatar: 'https://i.pravatar.cc/150?img=3'
  },
  {
    id: 4,
    name: 'Phạm Thị Dung',
    role: 'Designer',
    email: 'dung.pham@company.com',
    avatar: 'https://i.pravatar.cc/150?img=4'
  },
  {
    id: 5,
    name: 'Hoàng Văn Em',
    role: 'Tester',
    email: 'em.hoang@company.com',
    avatar: 'https://i.pravatar.cc/150?img=5'
  },
  {
    id: 6,
    name: 'Võ Thị Phương',
    role: 'Business Analyst',
    email: 'phuong.vo@company.com',
    avatar: 'https://i.pravatar.cc/150?img=6'
  }
];

// Mock Tasks
export const mockTasks: Task[] = [
  {
    id: 'TASK-001',
    title: 'Thiết kế giao diện dashboard',
    description: 'Tạo mockup và prototype cho trang dashboard chính',
    status: 'done',
    priority: 'high',
    assignee: mockMembers[3],
    dueDate: '2025-11-10',
    createdAt: '2025-10-25',
    updatedAt: '2025-11-08',
    tags: ['design', 'ui/ux'],
    estimatedHours: 16,
    actualHours: 14
  },
  {
    id: 'TASK-002',
    title: 'Xây dựng API authentication',
    description: 'Implement JWT authentication với refresh token',
    status: 'done',
    priority: 'urgent',
    assignee: mockMembers[1],
    dueDate: '2025-11-12',
    createdAt: '2025-10-26',
    updatedAt: '2025-11-11',
    tags: ['backend', 'security'],
    estimatedHours: 24,
    actualHours: 28
  },
  {
    id: 'TASK-003',
    title: 'Tích hợp biểu đồ thống kê',
    description: 'Sử dụng Chart.js để hiển thị các biểu đồ báo cáo',
    status: 'in_progress',
    priority: 'high',
    assignee: mockMembers[2],
    dueDate: '2025-11-15',
    createdAt: '2025-11-01',
    updatedAt: '2025-11-05',
    tags: ['frontend', 'charts'],
    estimatedHours: 20,
    actualHours: 12
  },
  {
    id: 'TASK-004',
    title: 'Viết test cases cho module user',
    description: 'Unit tests và integration tests cho user management',
    status: 'review',
    priority: 'medium',
    assignee: mockMembers[4],
    dueDate: '2025-11-18',
    createdAt: '2025-11-02',
    updatedAt: '2025-11-05',
    tags: ['testing', 'quality'],
    estimatedHours: 16,
    actualHours: 15
  },
  {
    id: 'TASK-005',
    title: 'Tối ưu hóa database queries',
    description: 'Thêm indexes và optimize slow queries',
    status: 'todo',
    priority: 'medium',
    assignee: mockMembers[1],
    dueDate: '2025-11-20',
    createdAt: '2025-11-03',
    updatedAt: '2025-11-03',
    tags: ['backend', 'performance'],
    estimatedHours: 12,
    actualHours: 0
  },
  {
    id: 'TASK-006',
    title: 'Cập nhật tài liệu API',
    description: 'Viết Swagger documentation cho tất cả endpoints',
    status: 'todo',
    priority: 'low',
    assignee: mockMembers[5],
    dueDate: '2025-11-25',
    createdAt: '2025-11-04',
    updatedAt: '2025-11-04',
    tags: ['documentation'],
    estimatedHours: 8,
    actualHours: 0
  },
  {
    id: 'TASK-007',
    title: 'Implement real-time notifications',
    description: 'Sử dụng WebSocket để gửi thông báo real-time',
    status: 'in_progress',
    priority: 'high',
    assignee: mockMembers[2],
    dueDate: '2025-11-22',
    createdAt: '2025-11-01',
    updatedAt: '2025-11-05',
    tags: ['backend', 'websocket'],
    estimatedHours: 32,
    actualHours: 18
  },
  {
    id: 'TASK-008',
    title: 'Responsive design cho mobile',
    description: 'Đảm bảo giao diện hoạt động tốt trên mobile',
    status: 'todo',
    priority: 'high',
    assignee: mockMembers[3],
    dueDate: '2025-11-28',
    createdAt: '2025-11-05',
    updatedAt: '2025-11-05',
    tags: ['frontend', 'mobile'],
    estimatedHours: 20,
    actualHours: 0
  },
  {
    id: 'TASK-009',
    title: 'Code review module authentication',
    description: 'Review và refactor code cho authentication module',
    status: 'review',
    priority: 'medium',
    assignee: mockMembers[0],
    dueDate: '2025-11-16',
    createdAt: '2025-11-04',
    updatedAt: '2025-11-05',
    tags: ['code-review'],
    estimatedHours: 8,
    actualHours: 6
  },
  {
    id: 'TASK-010',
    title: 'Setup CI/CD pipeline',
    description: 'Cấu hình GitHub Actions cho auto deployment',
    status: 'done',
    priority: 'urgent',
    assignee: mockMembers[1],
    dueDate: '2025-11-08',
    createdAt: '2025-10-28',
    updatedAt: '2025-11-07',
    tags: ['devops', 'ci/cd'],
    estimatedHours: 16,
    actualHours: 20
  }
];

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: 'PRJ-001',
    name: 'Hệ thống quản lý nhân sự HRMS',
    description: 'Xây dựng hệ thống quản lý nhân sự toàn diện với các module: chấm công, lương, đánh giá, tuyển dụng',
    status: 'active',
    startDate: '2025-10-01',
    endDate: '2026-03-31',
    progress: 65,
    budget: 500000000,
    spent: 325000000,
    manager: mockMembers[0],
    members: mockMembers,
    tasks: mockTasks,
    tags: ['web', 'hrms', 'enterprise'],
    client: 'ABC Corporation',
    createdAt: '2025-09-15',
    updatedAt: '2025-11-05'
  },
  {
    id: 'PRJ-002',
    name: 'Mobile App E-Commerce',
    description: 'Ứng dụng mobile bán hàng với tích hợp thanh toán và quản lý đơn hàng',
    status: 'planning',
    startDate: '2025-12-01',
    endDate: '2026-05-31',
    progress: 15,
    budget: 300000000,
    spent: 45000000,
    manager: mockMembers[0],
    members: [mockMembers[0], mockMembers[1], mockMembers[3]],
    tasks: [],
    tags: ['mobile', 'ecommerce', 'react-native'],
    client: 'XYZ Retail',
    createdAt: '2025-10-20',
    updatedAt: '2025-11-05'
  },
  {
    id: 'PRJ-003',
    name: 'Dashboard Analytics Platform',
    description: 'Nền tảng phân tích dữ liệu và báo cáo với biểu đồ real-time',
    status: 'completed',
    startDate: '2025-06-01',
    endDate: '2025-10-31',
    progress: 100,
    budget: 200000000,
    spent: 195000000,
    manager: mockMembers[0],
    members: [mockMembers[0], mockMembers[2], mockMembers[4]],
    tasks: [],
    tags: ['analytics', 'dashboard', 'big-data'],
    client: 'Tech Solutions Ltd',
    createdAt: '2025-05-10',
    updatedAt: '2025-10-31'
  }
];

// Calculate Statistics
export const calculateProjectStatistics = (project: Project): ProjectStatistics => {
  const tasks = project.tasks;
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const reviewTasks = tasks.filter(t => t.status === 'review').length;
  
  const now = new Date();
  const overdueTasks = tasks.filter(t => 
    t.status !== 'done' && new Date(t.dueDate) < now
  ).length;
  
  const totalHoursEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalHoursActual = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
  
  const efficiency = totalHoursEstimated > 0 
    ? Math.round((totalHoursActual / totalHoursEstimated) * 100) 
    : 0;
    
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
    
  const averageTaskTime = completedTasks > 0
    ? Math.round(tasks.filter(t => t.status === 'done')
        .reduce((sum, t) => sum + (t.actualHours || 0), 0) / completedTasks)
    : 0;
  
  // Member workload
  const memberWorkload = project.members.map(member => {
    const assigned = tasks.filter(t => t.assignee?.id === member.id).length;
    const completed = tasks.filter(t => 
      t.assignee?.id === member.id && t.status === 'done'
    ).length;
    
    return {
      member,
      assignedTasks: assigned,
      completedTasks: completed
    };
  });
  
  // Tasks by priority
  const tasksByPriority = {
    low: tasks.filter(t => t.priority === 'low').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    high: tasks.filter(t => t.priority === 'high').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length
  };
  
  // Tasks by status
  const tasksByStatus = {
    todo: todoTasks,
    in_progress: inProgressTasks,
    review: reviewTasks,
    done: completedTasks
  };
  
  // Weekly progress (last 4 weeks)
  const weeklyProgress = [
    { week: 'Tuần 1', completed: 2, created: 3 },
    { week: 'Tuần 2', completed: 3, created: 2 },
    { week: 'Tuần 3', completed: 2, created: 4 },
    { week: 'Tuần 4', completed: 3, created: 1 }
  ];
  
  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    reviewTasks,
    overdueTasks,
    totalHoursEstimated,
    totalHoursActual,
    efficiency,
    completionRate,
    averageTaskTime,
    memberWorkload,
    tasksByPriority,
    tasksByStatus,
    weeklyProgress
  };
};

// Mock Timeline Events
export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: 'EVT-001',
    type: 'milestone',
    title: 'Dự án được khởi tạo',
    description: 'Dự án HRMS chính thức bắt đầu',
    timestamp: '2025-10-01T09:00:00',
    user: mockMembers[0]
  },
  {
    id: 'EVT-002',
    type: 'member_added',
    title: 'Thêm thành viên mới',
    description: 'Trần Thị Bình được thêm vào dự án',
    timestamp: '2025-10-02T10:30:00',
    user: mockMembers[0]
  },
  {
    id: 'EVT-003',
    type: 'task_created',
    title: 'Task mới được tạo',
    description: 'TASK-001: Thiết kế giao diện dashboard',
    timestamp: '2025-10-25T14:00:00',
    user: mockMembers[0],
    relatedTask: 'TASK-001'
  },
  {
    id: 'EVT-004',
    type: 'task_completed',
    title: 'Task hoàn thành',
    description: 'TASK-010: Setup CI/CD pipeline',
    timestamp: '2025-11-07T16:45:00',
    user: mockMembers[1],
    relatedTask: 'TASK-010'
  },
  {
    id: 'EVT-005',
    type: 'milestone',
    title: 'Milestone: Phase 1 Complete',
    description: 'Hoàn thành giai đoạn 1 - Authentication & Authorization',
    timestamp: '2025-11-12T17:00:00',
    user: mockMembers[0]
  }
];

// Service functions
export const projectService = {
  getProjects: (): Promise<Project[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockProjects), 500);
    });
  },
  
  getProjectById: (id: string): Promise<Project | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Try to find project by id. If not found (for example when clicking an
        // item that comes from a different backend), return a fallback mock
        // project so the detail view can still render using fake data.
        let project = mockProjects.find(p => p.id === id);

        // Accept some loose matching (id may be passed as number or different
        // casing), try matching by name or partial id as a last resort.
        if (!project) {
          const idStr = String(id || '').toLowerCase();
          project = mockProjects.find(p => String(p.id).toLowerCase() === idStr)
            || mockProjects.find(p => p.id.toLowerCase().includes(idStr))
            || mockProjects.find(p => p.name.toLowerCase().includes(idStr));
        }

        // Fallback to first mock project so the UI always has data to display.
        resolve(project || mockProjects[0] || null);
      }, 300);
    });
  },
  
  getProjectStatistics: (projectId: string): Promise<ProjectStatistics | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Use the same flexible matching logic as getProjectById so that
        // statistics are available even when the id doesn't exactly match.
        let project = mockProjects.find(p => p.id === projectId);
        if (!project) {
          const idStr = String(projectId || '').toLowerCase();
          project = mockProjects.find(p => String(p.id).toLowerCase() === idStr)
            || mockProjects.find(p => p.id.toLowerCase().includes(idStr))
            || mockProjects.find(p => p.name.toLowerCase().includes(idStr));
        }

        // If still not found, fallback to the first mock project so UI can render stats.
        const target = project || mockProjects[0] || null;
        resolve(target ? calculateProjectStatistics(target) : null);
      }, 300);
    });
  },
  
  getProjectTimeline: (projectId: string): Promise<TimelineEvent[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockTimelineEvents), 300);
    });
  }
};
