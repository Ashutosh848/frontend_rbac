import axios, { AxiosRequestConfig } from 'axios';
import { CreateRoleRequest } from '../types';

const API_BASE = 'http://localhost:8000/api/v1';

// Token management
class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  removeToken(): void {
    localStorage.removeItem('access_token');
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  async refreshToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_BASE}/token/refresh/`, {
        refresh: refreshToken
      });
      
      const newToken = response.data.access;
      this.setToken(newToken);
      return newToken;
    } catch (error) {
      this.removeToken();
      localStorage.removeItem('refresh_token');
      throw new Error('Token refresh failed');
    }
  }
}

const tokenManager = TokenManager.getInstance();

// Enhanced auth headers function
const getAuthHeaders = async (): Promise<AxiosRequestConfig> => {
  let token = tokenManager.getToken();
  
  if (!token) {
    throw new Error('No authentication token found. Please log in again.');
  }

  // Check if token is expired and refresh if needed
  if (tokenManager.isTokenExpired(token)) {
    try {
      token = await tokenManager.refreshToken();
    } catch (error) {
      window.location.href = '/login';
      throw error;
    }
  }
  
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// Enhanced authentication check
export const isAuthenticated = (): boolean => {
  const token = tokenManager.getToken();
  if (!token) return false;
  
  return !tokenManager.isTokenExpired(token);
};

// Request interceptor with better error handling
axios.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    return config;
  },
  (error) => {
    console.error('Request configuration error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: originalRequest?.url
    });
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await tokenManager.refreshToken();
        const authConfig = await getAuthHeaders();
        originalRequest.headers = { ...originalRequest.headers, ...authConfig.headers };
        return axios(originalRequest);
      } catch (refreshError) {
        tokenManager.removeToken();
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    if (error.response?.status === 403) {
      console.error('Access forbidden. Check user permissions.');
    }
    
    return Promise.reject(error);
  }
);

// Enhanced API functions with better error handling
const handleApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    return await apiCall();
  } catch (error: any) {
    // Log detailed error information
    console.error('API call failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // Transform error for better user experience
    if (error.response?.status === 400) {
      const validationErrors = error.response.data;
      throw new Error(`Validation failed: ${JSON.stringify(validationErrors)}`);
    }
    
    if (error.response?.status === 500) {
      throw new Error('Server error occurred. Please try again later.');
    }
    
    throw error;
  }
};

// Role APIs (ADDED MISSING FUNCTIONS)
export const fetchRoles = async () => {
  return handleApiCall(async () => {
    console.log('Fetching roles from:', `${API_BASE}/roles/`);
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/roles/`, authConfig);
    console.log('Roles response:', response.data);
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      console.log('Extracting results from paginated response:', response.data.results);
      return response.data.results;
    }
    
    // Handle direct array response (fallback)
    return Array.isArray(response.data) ? response.data : [];
  });
};

export const createRole = async (roleData: CreateRoleRequest) => {
  return handleApiCall(async () => {
    console.log('Creating role:', roleData);
    const authConfig = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/roles/`, roleData, authConfig);
    console.log('Role created:', response.data);
    return response.data;
  });
};

export const updateRole = async (roleId: number, roleData: Partial<CreateRoleRequest>) => {
  return handleApiCall(async () => {
    console.log('Updating role:', roleId, roleData);
    const authConfig = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/roles/${roleId}/`, roleData, authConfig);
    console.log('Role updated:', response.data);
    return response.data;
  });
};

export const deleteRole = async (roleId: number) => {
  return handleApiCall(async () => {
    console.log('Deleting role:', roleId);
    const authConfig = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/roles/${roleId}/`, authConfig);
    console.log('Role deleted:', response.data);
    return response.data;
  });
};

export const fetchRoleUsers = async (roleId: number) => {
  return handleApiCall(async () => {
    console.log(`Fetching users for role ${roleId}...`);
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/roles/${roleId}/users/`, authConfig);
    console.log('Role users fetched successfully:', response.data);
    return response.data;
  });
};

// Bulk operations for roles
export const bulkDeleteRoles = async (roleIds: number[]): Promise<void> => {
  console.log('Bulk deleting roles:', roleIds);
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    await axios.post(`${API_BASE}/roles/bulk_delete/`, { ids: roleIds }, authConfig);
    console.log('Roles bulk deleted successfully');
  });
};

export const bulkUpdateRoles = async (roleIds: number[], updateData: Partial<CreateRoleRequest>): Promise<void> => {
  console.log('Bulk updating roles:', roleIds, updateData);
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    await axios.post(`${API_BASE}/roles/bulk_update/`, { 
      ids: roleIds, 
      data: updateData 
    }, authConfig);
    console.log('Roles bulk updated successfully');
  });
};

// Group APIs
export const fetchGroups = async () => {
  return handleApiCall(async () => {
    console.log('Fetching groups from:', `${API_BASE}/groups/`);
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/groups/`, authConfig);
    console.log('Groups response:', response.data);
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      console.log('Extracting results from paginated response:', response.data.results);
      return response.data.results;
    }
    
    // Handle direct array response (fallback)
    return Array.isArray(response.data) ? response.data : [];
  });
};

export const createGroup = async (groupData: any) => {
  return handleApiCall(async () => {
    console.log('Creating group:', groupData);
    const authConfig = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/groups/`, groupData, authConfig);
    console.log('Group created:', response.data);
    return response.data;
  });
};

export const updateGroup = async (groupId: number, groupData: any) => {
  return handleApiCall(async () => {
    console.log('Updating group:', groupId, groupData);
    const authConfig = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/groups/${groupId}/`, groupData, authConfig);
    console.log('Group updated:', response.data);
    return response.data;
  });
};

export const deleteGroup = async (groupId: number) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/groups/${groupId}/`, authConfig);
    return response.data;
  });
};

export const getGroupRoles = async (groupId: number) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/groups/${groupId}/roles/`, authConfig);
    return response.data;
  });
};

// Application APIs
export const fetchApplications = async () => {
  return handleApiCall(async () => {
    console.log('Fetching applications from:', `${API_BASE}/applications/`);
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/applications/`, authConfig);
    console.log('Applications response:', response.data);
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      console.log('Extracting results from paginated response:', response.data.results);
      return response.data.results;
    }
    
    // Handle direct array response (fallback)
    return Array.isArray(response.data) ? response.data : [];
  });
};

export const createApplication = async (applicationData: any) => {
  return handleApiCall(async () => {
    console.log('Creating application:', applicationData);
    const authConfig = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/applications/`, applicationData, authConfig);
    console.log('Application created:', response.data);
    return response.data;
  });
};

export const updateApplication = async (applicationId: number, applicationData: any) => {
  return handleApiCall(async () => {
    console.log('Updating application:', applicationId, applicationData);
    const authConfig = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/applications/${applicationId}/`, applicationData, authConfig);
    console.log('Application updated:', response.data);
    return response.data;
  });
};

export const deleteApplication = async (applicationId: number) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/applications/${applicationId}/`, authConfig);
    return response.data;
  });
};

export const toggleApplicationStatus = async (applicationId: number) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.patch(`${API_BASE}/applications/${applicationId}/toggle_status/`, {}, authConfig);
    return response.data;
  });
};

export const getApplicationGroups = async (applicationId: number) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/applications/${applicationId}/groups/`, authConfig);
    return response.data;
  });
};

export const getApplicationUsersWithAccess = async (applicationId: number) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/applications/${applicationId}/users_with_access/`, authConfig);
    return response.data;
  });
};

// User APIs
export const fetchUsers = async () => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/users/`, authConfig);
    return response.data;
  });
};

export const createUser = async (userData: any) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.post(`${API_BASE}/users/`, userData, authConfig);
    return response.data;
  });
};

export const updateUser = async (userId: number, userData: any) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.put(`${API_BASE}/users/${userId}/`, userData, authConfig);
    return response.data;
  });
};

export const deleteUser = async (userId: number) => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE}/users/${userId}/`, authConfig);
    return response.data;
  });
};

export const getCurrentUser = async () => {
  return handleApiCall(async () => {
    const authConfig = await getAuthHeaders();
    const response = await axios.get(`${API_BASE}/users/me/`, authConfig);
    return response.data;
  });
};

// Auth APIs
export const login = async (credentials: { username: string; password: string }) => {
  return handleApiCall(async () => {
    const response = await axios.post(`${API_BASE}/token/`, credentials);
    const { access, refresh } = response.data;
    
    tokenManager.setToken(access);
    localStorage.setItem('refresh_token', refresh);
    
    return response.data;
  });
};

export const logout = () => {
  tokenManager.removeToken();
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
};