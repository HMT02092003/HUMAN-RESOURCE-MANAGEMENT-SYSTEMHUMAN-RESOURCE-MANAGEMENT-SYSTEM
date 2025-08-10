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
  private baseURL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000';

  // Get all roles
  async getAllRoles() {
    try {
      const response = await api.get(`${this.baseURL}/api/auth/roles`);
      return response.data.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get role detail by ID
  async getRoleDetail(id: string) {
    try {
      const response = await api.get(`${this.baseURL}/api/auth/roles/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create new role
  async createRole(values: any) {
    try {
      const response = await api.post(`${this.baseURL}/api/auth/createRole`, values);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update role
  async updateRole(id: string, values: any) {
    try {
      const response = await api.put(`${this.baseURL}/api/auth/roles`, { id, ...values });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete single role 
  async deleteRole(id: string) {
    try {
      const response = await api.delete(`${this.baseURL}/api/auth/deleteRole`, { params: { id } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Delete multiple roles
  async deleteMultipleRoles(ids: React.Key[]) {
    try {
      const response = await api.delete(`${this.baseURL}/api/auth/deleteMultipleRoles`, { data: { ids } });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Get role permissions
  async getRolePermissions(roleId: string) {
    try {
      const response = await api.get(`${this.baseURL}/api/auth/rolePermission/${roleId}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Update role permissions
  async updateRolePermissions(roleId: string, permissions: { [key: string]: number }, scopes: { [key: string]: number }) {
    try {
      const response = await api.put(`${this.baseURL}/api/auth/rolePermission`, {
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