import api from './apiService';

const JOB_SERVICE_PREFIX = '/jobs'; // proxied by API Gateway to job-service

// AI Analysis - Updated to use /projects endpoints
export const analyzeJob = (payload: { 
  title: string; 
  description: string; 
  project_id?: string;
  start_date?: string;
  due_date?: string;
}) => {
  return api.post(`${JOB_SERVICE_PREFIX}/projects/analyze-task`, payload);
};

export const findCandidates = (payload: {
  job_id?: string;
  job_title?: string;
  job_estimated_hours?: number;
  job_estimated_days?: number;
  project_id?: string;
  required_skills: Array<{
    skill_id: number;
    proficiency_level: string;
    importance: string;
  }>;
  min_match_score?: number;
  max_results?: number;
  check_workload?: boolean;
}) => {
  return api.post(`${JOB_SERVICE_PREFIX}/projects/find-candidates`, payload);
};

export const createJobWithAnalysis = (payload: any) => {
  return api.post(`${JOB_SERVICE_PREFIX}/projects/create-task-with-analysis`, payload);
};

// CV Management
export const uploadCv = (payload: Record<string, any>) => {
  return api.post(`${JOB_SERVICE_PREFIX}/cvs/upload`, payload);
};

export const fetchCvs = (params?: any) => {
  return api.get(`${JOB_SERVICE_PREFIX}/cvs`, { params });
};

export const deleteCv = (cvId: string) => {
  return api.delete(`${JOB_SERVICE_PREFIX}/cvs/${cvId}`);
};

export const bulkDeleteCvs = (ids: string[]) => {
  return api.post(`${JOB_SERVICE_PREFIX}/cvs/bulk-delete`, { ids });
};

export const createProject = (payload: any) => {
  return api.post(`${JOB_SERVICE_PREFIX}/projects`, payload);
};

export const getAllProjectByScope = (params?: any) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects`, { params });
}

export const getProjectById = (projectId: string) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects/${projectId}`);
};

export const updateProject = (projectId: string, payload: any) => {
  return api.put(`${JOB_SERVICE_PREFIX}/projects/${projectId}`, payload);
};

export const deleteProject = (projectIdsOrPayload: string[] | { ids: string[] }) => {
  const payload = Array.isArray(projectIdsOrPayload) ? { ids: projectIdsOrPayload } : projectIdsOrPayload;
  return api.delete(`${JOB_SERVICE_PREFIX}/projects`, { data: payload });
};

export const getUserTasks = (projectId: string, userId: string) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects/${projectId}/users/${userId}/tasks`);
};

// Task Management APIs - Updated to use /projects endpoints
export const getProjectTasks = (projectId: string, params?: any) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects/${projectId}/tasks`, { params });
};

export const getProjectTaskStatistics = (projectId: string) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects/${projectId}/tasks/statistics`);
};

// Update task status
export const updateTaskStatus = (projectId: string, taskId: string, status: 'todo' | 'in_progress' | 'done') => {
  return api.put(`${JOB_SERVICE_PREFIX}/projects/${projectId}/tasks/${taskId}/status`, { status });
};

// Update task (full update)
export const updateTask = (projectId: string, taskId: string, payload: any) => {
  return api.put(`${JOB_SERVICE_PREFIX}/projects/${projectId}/tasks/${taskId}`, payload);
};

// Delete task
export const deleteTask = (projectId: string, taskId: string) => {
  return api.delete(`${JOB_SERVICE_PREFIX}/projects/${projectId}/tasks/${taskId}`);
};

// Get current user's tasks with filters
export const getMyTasks = (params?: {
  status?: string; // 'todo', 'in_progress', 'done' hoặc nhiều giá trị cách nhau bởi dấu phẩy: 'todo,in_progress'
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  project_id?: string;
}) => {
  return api.get(`${JOB_SERVICE_PREFIX}/tasks/my-tasks`, { params });
};

// Project Tab APIs - Updated to use /projects endpoints
export const getProjectOverview = (projectId: string) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects/${projectId}/overview`);
};

export const getProjectMembers = (projectId: string) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects/${projectId}/members`);
};

export const getProjectTimeline = (projectId: string, params?: { limit?: number }) => {
  return api.get(`${JOB_SERVICE_PREFIX}/projects/${projectId}/timeline`, { params });
};

export default {
  analyzeJob,
  findCandidates,
  createJobWithAnalysis,
  uploadCv,
  fetchCvs,
  deleteCv,
  bulkDeleteCvs,
  createProject,
  getAllProjectByScope,
  getProjectById,
  updateProject,
  deleteProject,
  getUserTasks,
  getProjectTasks,
  getProjectTaskStatistics,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getMyTasks,
  getProjectOverview,
  getProjectMembers,
  getProjectTimeline,
};
