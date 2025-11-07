import api from './apiService';

const JOB_SERVICE_PREFIX = '/jobs'; // proxied by API Gateway to job-service

// AI Analysis
export const analyzeJob = (payload: { title: string; description: string; project_id?: string }) => {
  return api.post(`${JOB_SERVICE_PREFIX}/jobs/analyze`, payload);
};

export const findCandidates = (payload: {
  job_id?: string;
  required_skills: Array<{
    skill_id: number;
    proficiency_level: string;
    importance: string;
  }>;
  min_match_score?: number;
  max_results?: number;
}) => {
  return api.post(`${JOB_SERVICE_PREFIX}/jobs/find-candidates`, payload);
};

export const createJobWithAnalysis = (payload: any) => {
  return api.post(`${JOB_SERVICE_PREFIX}/jobs/create-with-analysis`, payload);
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
};
