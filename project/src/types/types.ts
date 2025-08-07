// src/types/types.ts

export interface Role {
  id: number;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  groups?: Group[]; // Array of group objects with id and name
  permissions?: Permission[];
  users_count?: number;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  applications?: Application[];
}

export interface User {
  id?: number;
  name: string;
  email: string;
  password: string;
  status: 'active' | 'inactive';
  role_ids: number[];
  group_ids: number[];
}

export interface Application {
  id?: number;
  name: string;
  description: string;
  url?: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  created_at?: string;
  updated_at?: string;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  group_names?: string[]; // Changed from group_ids to group_names
  permission_ids?: number[]; // Keep this if you're also using permissions
}