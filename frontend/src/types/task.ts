// Task status types (only 3 statuses)
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  task_id: string;
  project_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: number;
  assignee_name?: string;
  assignee_email?: string;
  due_date?: string;
  estimated_days?: number; // canonical: days (1 day = 8 hours)
  estimated_hours?: number; // kept for backward compatibility
  actual_hours?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface TaskStatistics {
  total_tasks: number;
  
  by_status: {
    todo: number;
    in_progress: number;
    done: number;
  };
  
  by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  
  hours: {
    total_estimated: number;
    total_actual: number;
    completed_estimated: number;
    completed_actual: number;
  };
  
  completion_rate: number; // 0-100
  
  by_assignee: {
    [userId: number]: number;
  };
}

export interface ChartData {
  status_chart: Array<{
    name: string;
    value: number;
    status: TaskStatus;
  }>;
  
  priority_chart: Array<{
    name: string;
    value: number;
    priority: TaskPriority;
  }>;
  
  hours_chart: Array<{
    name: string;
    value: number;
    type: 'estimated' | 'actual';
  }>;
  
  timeline: Array<{
    date: string;
    todo: number;
    in_progress: number;
    done: number;
  }>;
}

export interface TaskStatisticsResponse {
  success: boolean;
  project_id: number;
  statistics: TaskStatistics;
  charts: ChartData;
}
