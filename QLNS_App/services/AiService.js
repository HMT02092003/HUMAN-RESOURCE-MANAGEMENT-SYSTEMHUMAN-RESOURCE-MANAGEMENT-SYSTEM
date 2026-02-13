import api from './api';

const AiService = {
    /**
     * Get attendance logs from AI service
     * @param {Object} params
     * @param {number} params.page
     * @param {number} params.page_size
     * @param {string} params.start_date
     * @param {string} params.end_date
     * @param {number} [params.user_id]
     * @param {string} [params.search_name]
     * @param {string} [params.search_dept]
     * @param {string} [params.search_time]
     */
    getAttendanceLogs: async (params) => {
        try {
            // Note: The frontend uses /api/ai/logs via next.js proxy, so it's likely /ai/logs on the gateway or similar.
            // Updated to match Web Frontend endpoint
            const response = await api.get('/ai/logs', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching attendance logs:', error);
            throw error;
        }
    }
};

export default AiService;
