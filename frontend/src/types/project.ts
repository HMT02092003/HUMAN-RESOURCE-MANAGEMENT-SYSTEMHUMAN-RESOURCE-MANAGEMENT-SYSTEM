// Project Management Types
export interface ProjectMember {
  id: number;
  name: string;
  avatar?: string;
  role: 'Project Manager' | 'Developer' | 'Designer' | 'Tester' | 'Business Analyst';
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: ProjectMember;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  progress: number;
  budget?: number;
  spent?: number;
  manager: ProjectMember;
  members: ProjectMember[];
  tasks: Task[];
  tags: string[];
  client?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  reviewTasks: number;
  overdueTasks: number;
  totalHoursEstimated: number;
  totalHoursActual: number;
  efficiency: number;
  completionRate: number;
  averageTaskTime: number;
  memberWorkload: {
    member: ProjectMember;
    assignedTasks: number;
    completedTasks: number;
  }[];
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  tasksByStatus: {
    todo: number;
    in_progress: number;
    review: number;
    done: number;
  };
  weeklyProgress: {
    week: string;
    completed: number;
    created: number;
  }[];
}

export interface TimelineEvent {
  id: string;
  type: 'task_created' | 'task_completed' | 'member_added' | 'milestone' | 'comment';
  title: string;
  description?: string;
  timestamp: string;
  user?: ProjectMember;
  relatedTask?: string;
}

export type TaskStatusType = Task['status'];
export type TaskPriorityType = Task['priority'];
export type ProjectStatusType = Project['status'];
