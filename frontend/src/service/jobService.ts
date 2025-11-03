import api from './apiService';

const JOB_SERVICE_PREFIX = '/jobs'; // proxied by API Gateway to job-service

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

export default {
  uploadCv,
  fetchCvs,
  deleteCv,
  bulkDeleteCvs
};
