import apiService from './apiService';

export const ChevronService = {
    getAllChevrons: async () => {
        try {
            console.log('👔 [ChevronService] Fetching all chevrons...');
            // For mobile app the API base includes '/api', so call without leading '/api'
            const response = await apiService.get('/employee/all/chevrons');
            console.log('✅ [ChevronService] Got chevrons:', response.data?.length || 0);
            return response.data;
        } catch (error) {
            console.error('❌ [ChevronService] Error fetching chevrons:', error);
            throw error;
        }
    },

    getChevronDetail: async (id) => {
        try {
            console.log('👔 [ChevronService] Fetching chevron detail:', id);
            const response = await apiService.post('/employee/getChevronDetail', { id });
            return response.data;
        } catch (error) {
            console.error('❌ [ChevronService] Error fetching chevron detail:', error);
            throw error;
        }
    },

    createChevron: async (data) => {
        try {
            console.log('👔 [ChevronService] Creating chevron:', data);
            const response = await apiService.post('/employee/createChevrons', data);
            return response.data;
        } catch (error) {
            console.error('❌ [ChevronService] Error creating chevron:', error);
            throw error;
        }
    },

    updateChevron: async (id, data) => {
        try {
            console.log('👔 [ChevronService] Updating chevron:', id, data);
            const payload = { id: Number(id), ...data };
            console.log('📦 [ChevronService] Payload:', JSON.stringify(payload));
            const response = await apiService.put('/employee/updateChevron', payload);
            return response.data;
        } catch (error) {
            console.error('❌ [ChevronService] Error updating chevron:', error);
            throw error;
        }
    },

    deleteChevron: async (id) => {
        try {
            console.log('👔 [ChevronService] Deleting chevron:', id);
            const response = await apiService.delete('/employee/deleteChevron', { params: { id } });
            return response.data;
        } catch (error) {
            console.error('❌ [ChevronService] Error deleting chevron:', error);
            throw error;
        }
    },

    deleteMultipleChevrons: async (ids) => {
        try {
            console.log('👔 [ChevronService] Deleting multiple chevrons:', ids);
            const response = await apiService.delete('/employee/deleteMultipleChevrons', { data: { ids } });
            return response.data;
        } catch (error) {
            console.error('❌ [ChevronService] Error deleting multiple chevrons:', error);
            throw error;
        }
    }
};
