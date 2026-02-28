import apiService from './apiService';

class RoleService {
  // Get all roles
  static async getAllRoles() {
    try {
      console.log('🛡️ [RoleService] Fetching all roles');
      const response = await apiService.get('/auth/roles');
      console.log('✅ [RoleService] Got roles:', response.data?.data?.length || 0);
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }

  // Get role detail by ID
  static async getRoleDetail(id) {
    try {
      console.log('🛡️ [RoleService] Fetching role detail:', id);
      const response = await apiService.get(`/auth/roles/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }

  // Create new role
  static async createRole(values) {
    try {
      console.log('🛡️ [RoleService] Creating role:', values);
      const response = await apiService.post('/auth/createRole', values);
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }

  // Update role
  static async updateRole(id, values) {
    try {
      console.log('🛡️ [RoleService] Updating role:', id, values);
      const response = await apiService.put('/auth/roles', { id, ...values });
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }

  // Delete single role
  static async deleteRole(id) {
    try {
      console.log('🛡️ [RoleService] Deleting role:', id);
      const response = await apiService.delete('/auth/deleteRole', { params: { id } });
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }

  // Delete multiple roles
  static async deleteMultipleRoles(ids) {
    try {
      console.log('🛡️ [RoleService] Deleting multiple roles:', ids);
      const response = await apiService.delete('/auth/deleteMultipleRoles', { data: { ids } });
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error:', error);
      throw error;
    }
  }

  // Get role permissions (returns categories with permissions array)
  static async getRolePermissions(roleId) {
    try {
      console.log('🛡️ [RoleService] Fetching permissions for role:', roleId);
      const response = await apiService.get(`/auth/rolePermission/${roleId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error fetching permissions:', error);
      throw error;
    }
  }

  // Update role permissions
  static async updateRolePermissions(roleId, permissions, scopes) {
    try {
      console.log('🛡️ [RoleService] Updating permissions for role:', roleId);
      const response = await apiService.put('/auth/rolePermission', { roleId, permissions, scopes });
      return response.data;
    } catch (error) {
      console.error('❌ [RoleService] Error updating permissions:', error);
      throw error;
    }
  }
}

export default RoleService;
