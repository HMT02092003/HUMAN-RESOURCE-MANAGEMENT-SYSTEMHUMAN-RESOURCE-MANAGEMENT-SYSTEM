import apiService from "./apiService";

export interface AttendanceLog {
    id: number;
    user_id: number;
    username: string;
    checkin_time: string;
    image_snapshot_url: string;
    recognition_type: string;
    status: string;
    similarity_score: number;
    confidence: number;
    matched_by_type: string;
    notes?: string;
    fullName?: string;
    department?: {
        id: number;
        name: string;
        description?: string;
    };
    user_info?: any;
}

export interface AttendanceLogsResponse {
    success: boolean;
    data: AttendanceLog[];
    total: number;
    page: number;
    page_size: number;
}

export const aiService = {
    getAttendanceLogs: async (params: {
        page?: number;
        page_size?: number;
        start_date?: string;
        end_date?: string;
        user_id?: number;
        user_ids?: number[];
        search_name?: string;
        search_dept?: string;
        search_time?: string;
    }) => {
        // Calls /api/ai/logs via Gateway (matches /api/ai prefix) -> Service receives /api/logs
        const response = await apiService.get<AttendanceLogsResponse>('/api/ai/logs', { params });
        return response.data;
    }
};
