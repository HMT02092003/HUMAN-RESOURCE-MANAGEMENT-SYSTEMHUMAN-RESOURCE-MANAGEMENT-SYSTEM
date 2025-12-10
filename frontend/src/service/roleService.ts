import api from './apiService';

interface Role {
  id: string | number;
  name: string;
  description?: string;
  parentName?: string;
  createdAt?: string | Date;
  [key: string]: any;
}

interface Permission {
  id: number;
  key: string;
  name: string;
  value: number;
  currentValue: number;
  scope?: number;
}

interface PermissionCategory {
  id: number;
  name: string;
  permissions: Permission[];
}

class RoleService {
  private baseURL = '';

  // Get all roles with optional params
  async getAllRoles(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: string }) {
    try {
      const response = await api.get(`/api/auth/roles`, { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get all roles as a plain array for select dropdowns
  // Some backend endpoints return a paginated object { data: [], total },
  // callers that need a simple array should use this helper which
  // returns response.data.data || response.data
  async getAllRolesForSelect() {
    try {
      const response = await api.get(`/api/auth/roles`);
      // If backend returns { data: [...], total }, prefer the inner array
      return response.data?.data || response.data || [];
    } catch (error: any) {
      throw error;
    }
  }

  // Get role detail by ID
  async getRoleDetail(id: string) {
    try {
      const response = await api.get(`/api/auth/roles/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new role
  async createRole(values: any) {
    try {
      const response = await api.post(`/api/auth/createRole`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update role
  async updateRole(id: string, values: any) {
    try {
      const response = await api.put(`/api/auth/roles`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single role 
  async deleteRole(id: string) {
    try {
      const response = await api.delete(`/api/auth/deleteRole`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple roles
  async deleteMultipleRoles(ids: React.Key[]) {
    try {
      const response = await api.delete(`/api/auth/deleteMultipleRoles`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get role permissions
  async getRolePermissions(roleId: string) {
    try {
      const response = await api.get(`/api/auth/rolePermission/${roleId}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update role permissions
  async updateRolePermissions(roleId: string, permissions: { [key: string]: number }, scopes: { [key: string]: number }) {
    try {
      const response = await api.put(`/api/auth/rolePermission`, {
        permissions,
        scopes,
        roleId,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }
}

export const roleService = new RoleService(); 