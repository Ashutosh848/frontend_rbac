export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  groups: Group[];
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  groups: Group[];
  permissions: Permission[];
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  applications: Application[];
  createdAt: string;
}

export interface Application {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'maintenance';
  url?: string;
  groups: Group[];
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
  groupIds: string[];
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  groupIds: string[];
  permissionIds: string[];
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  applicationIds: string[];
}

export interface CreateApplicationRequest {
  name: string;
  description: string;
  url?: string;
  status: 'active' | 'inactive' | 'maintenance';
}