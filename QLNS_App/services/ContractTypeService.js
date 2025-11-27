import apiService from './apiService';

export const ContractTypeService = {
    getAllContractTypes: async () => {
        try {
            console.log('📜 [ContractTypeService] Fetching all contract types...');
            const response = await apiService.get('/employee/contractTypes');
            console.log('📜 [ContractTypeService] Response:', JSON.stringify(response.data, null, 2));
            // Handle both response formats: { data: [...] } or [...]
            const result = response.data?.data || response.data || [];
            console.log('📜 [ContractTypeService] Extracted', Array.isArray(result) ? result.length : 0, 'contract types');
            return result;
        } catch (error) {
            console.error('❌ [ContractTypeService] Error fetching contract types:', error.response?.status, error.response?.data || error.message);
            throw error;
        }
    },

    getContractTypeDetail: async (id) => {
        try {
            console.log('📜 [ContractTypeService] Fetching contract type detail:', id);
            const response = await apiService.get(`/employee/contractTypes/${id}`);
            return response.data;
        } catch (error) {
            console.error('❌ [ContractTypeService] Error fetching contract type detail:', error);
            throw error;
        }
    },

    createContractType: async (data) => {
        try {
            console.log('📜 [ContractTypeService] Creating contract type:', data);
            const response = await apiService.post('/employee/createContractType', data);
            return response.data;
        } catch (error) {
            console.error('❌ [ContractTypeService] Error creating contract type:', error);
            throw error;
        }
    },

    updateContractType: async (id, data) => {
        try {
            console.log('📜 [ContractTypeService] Updating contract type:', id, data);
            const response = await apiService.put('/employee/contractTypes', { id, ...data });
            return response.data;
        } catch (error) {
            console.error('❌ [ContractTypeService] Error updating contract type:', error);
            throw error;
        }
    },

    deleteContractType: async (id) => {
        try {
            console.log('📜 [ContractTypeService] Deleting contract type:', id);
            const response = await apiService.delete('/employee/deleteContractType', { params: { id } });
            return response.data;
        } catch (error) {
            console.error('❌ [ContractTypeService] Error deleting contract type:', error);
            throw error;
        }
    },

    deleteMultipleContractTypes: async (ids) => {
        try {
            console.log('📜 [ContractTypeService] Deleting multiple contract types:', ids);
            const response = await apiService.delete('/employee/deleteMultipleContractTypes', { data: { ids } });
            return response.data;
        } catch (error) {
            console.error('❌ [ContractTypeService] Error deleting multiple contract types:', error);
            throw error;
        }
    }
};
