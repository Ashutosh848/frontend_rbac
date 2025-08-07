import { User, Role, Group, Application, Permission, CreateUserRequest, CreateRoleRequest, CreateGroupRequest, CreateApplicationRequest } from '../types';

// Mock data
const mockPermissions: Permission[] = [
  { id: '1', name: 'Read Users', resource: 'users', action: 'read' },
  { id: '2', name: 'Write Users', resource: 'users', action: 'write' },
  { id: '3', name: 'Delete Users', resource: 'users', action: 'delete' },
  { id: '4', name: 'Read Reports', resource: 'reports', action: 'read' },
  { id: '5', name: 'Write Reports', resource: 'reports', action: 'write' },
];

const mockApplications: Application[] = [
  {
    id: '1',
    name: 'Customer Portal',
    description: 'Main customer-facing application',
    status: 'active',
    url: 'https://portal.example.com',
    groups: [],
    createdAt: '2024-01-15T10:00:00Z'
  },  
  {
    id: '2',
    name: 'Analytics Dashboard',
    description: 'Business intelligence and reporting',
    status: 'active',
    url: 'https://analytics.example.com',
    groups: [],
    createdAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '3',
    name: 'Admin Console',
    description: 'System administration interface',
    status: 'maintenance',
    url: 'https://admin.example.com',
    groups: [],
    createdAt: '2024-02-01T09:15:00Z'
  }
];

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Customer Service',
    description: 'Customer support and service team',
    applications: [mockApplications[0]],
    createdAt: '2024-01-10T08:00:00Z'
  },
  {
    id: '2',
    name: 'Analytics Team',
    description: 'Data analysts and business intelligence',
    applications: [mockApplications[1]],
    createdAt: '2024-01-12T11:30:00Z'
  },
  {
    id: '3',
    name: 'System Administrators',
    description: 'IT and system administration',
    applications: mockApplications,
    createdAt: '2024-01-05T16:45:00Z'
  }
];

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system administrator access',
    groups: mockGroups,
    permissions: mockPermissions,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Manager',
    description: 'Team manager with limited admin access',
    groups: [mockGroups[0], mockGroups[1]],
    permissions: mockPermissions.slice(0, 4),
    createdAt: '2024-01-03T12:00:00Z'
  },
  {
    id: '3',
    name: 'User',
    description: 'Standard user access',
    groups: [mockGroups[0]],
    permissions: [mockPermissions[0], mockPermissions[3]],
    createdAt: '2024-01-05T15:30:00Z'
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    roles: [mockRoles[0]],
    groups: mockGroups,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    lastLogin: '2024-03-15T14:22:00Z'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    roles: [mockRoles[1]],
    groups: [mockGroups[0], mockGroups[1]],
    status: 'active',
    createdAt: '2024-01-20T09:15:00Z',
    lastLogin: '2024-03-14T16:45:00Z'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    roles: [mockRoles[2]],
    groups: [mockGroups[0]],
    status: 'inactive',
    createdAt: '2024-02-01T11:00:00Z',
    lastLogin: '2024-02-28T13:30:00Z'
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    roles: [mockRoles[1], mockRoles[2]],
    groups: [mockGroups[1]],
    status: 'active',
    createdAt: '2024-02-10T14:20:00Z',
    lastLogin: '2024-03-15T10:15:00Z'
  }
];

// Update references
mockApplications[0].groups = [mockGroups[0], mockGroups[2]];
mockApplications[1].groups = [mockGroups[1], mockGroups[2]];
mockApplications[2].groups = [mockGroups[2]];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export const mockApi = {
  // Users
  async getUsers(): Promise<User[]> {
    await delay(300);
    return [...mockUsers];
  },

  async createUser(data: CreateUserRequest): Promise<User> {
    await delay(500);
    const newUser: User = {
      id: (mockUsers.length + 1).toString(),
      name: data.name,
      email: data.email,
      roles: mockRoles.filter(role => data.roleIds.includes(role.id)),
      groups: mockGroups.filter(group => data.groupIds.includes(group.id)),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    mockUsers.push(newUser);
    return newUser;
  },

  async updateUser(id: string, data: Partial<CreateUserRequest>): Promise<User> {
    await delay(500);
    const userIndex = mockUsers.findIndex(user => user.id === id);
    if (userIndex === -1) throw new Error('User not found');
    
    const updatedUser = {
      ...mockUsers[userIndex],
      ...data,
      roles: data.roleIds ? mockRoles.filter(role => data.roleIds!.includes(role.id)) : mockUsers[userIndex].roles,
      groups: data.groupIds ? mockGroups.filter(group => data.groupIds!.includes(group.id)) : mockUsers[userIndex].groups,
    };
    mockUsers[userIndex] = updatedUser;
    return updatedUser;
  },

  async deleteUser(id: string): Promise<void> {
    await delay(300);
    const index = mockUsers.findIndex(user => user.id === id);
    if (index === -1) throw new Error('User not found');
    mockUsers.splice(index, 1);
  },

  async toggleUserStatus(id: string): Promise<User> {
    await delay(300);
    const user = mockUsers.find(user => user.id === id);
    if (!user) throw new Error('User not found');
    user.status = user.status === 'active' ? 'inactive' : 'active';
    return user;
  },

  // Roles
  async getRoles(): Promise<Role[]> {
    await delay(300);
    return [...mockRoles];
  },

  async createRole(data: CreateRoleRequest): Promise<Role> {
    await delay(500);
    const newRole: Role = {
      id: (mockRoles.length + 1).toString(),
      ...data,
      groups: mockGroups.filter(group => data.groupIds.includes(group.id)),
      permissions: mockPermissions.filter(perm => data.permissionIds.includes(perm.id)),
      createdAt: new Date().toISOString()
    };
    mockRoles.push(newRole);
    return newRole;
  },

  async updateRole(id: string, data: Partial<CreateRoleRequest>): Promise<Role> {
    await delay(500);
    const roleIndex = mockRoles.findIndex(role => role.id === id);
    if (roleIndex === -1) throw new Error('Role not found');
    
    const updatedRole = {
      ...mockRoles[roleIndex],
      ...data,
      groups: data.groupIds ? mockGroups.filter(group => data.groupIds.includes(group.id)) : mockRoles[roleIndex].groups,
      permissions: data.permissionIds ? mockPermissions.filter(perm => data.permissionIds.includes(perm.id)) : mockRoles[roleIndex].permissions,
    };
    mockRoles[roleIndex] = updatedRole;
    return updatedRole;
  },

  async deleteRole(id: string): Promise<void> {
    await delay(300);
    const index = mockRoles.findIndex(role => role.id === id);
    if (index === -1) throw new Error('Role not found');
    mockRoles.splice(index, 1);
  },

  // Groups
  async getGroups(roleId?: string): Promise<Group[]> {
    await delay(300);
    if (roleId) {
      const role = mockRoles.find(r => r.id === roleId);
      return role ? role.groups : [];
    }
    return [...mockGroups];
  },

  async createGroup(data: CreateGroupRequest): Promise<Group> {
    await delay(500);
    const newGroup: Group = {
      id: (mockGroups.length + 1).toString(),
      ...data,
      applications: mockApplications.filter(app => data.applicationIds.includes(app.id)),
      createdAt: new Date().toISOString()
    };
    mockGroups.push(newGroup);
    return newGroup;
  },

  async updateGroup(id: string, data: Partial<CreateGroupRequest>): Promise<Group> {
    await delay(500);
    const groupIndex = mockGroups.findIndex(group => group.id === id);
    if (groupIndex === -1) throw new Error('Group not found');
    
    const updatedGroup = {
      ...mockGroups[groupIndex],
      ...data,
      applications: data.applicationIds ? mockApplications.filter(app => data.applicationIds.includes(app.id)) : mockGroups[groupIndex].applications,
    };
    mockGroups[groupIndex] = updatedGroup;
    return updatedGroup;
  },

  async deleteGroup(id: string): Promise<void> {
    await delay(300);
    const index = mockGroups.findIndex(group => group.id === id);
    if (index === -1) throw new Error('Group not found');
    mockGroups.splice(index, 1);
  },

  // Applications
  async getApplications(): Promise<Application[]> {
    await delay(300);
    return [...mockApplications];
  },

  async createApplication(data: CreateApplicationRequest): Promise<Application> {
    await delay(500);
    const newApp: Application = {
      id: (mockApplications.length + 1).toString(),
      ...data,
      groups: [],
      createdAt: new Date().toISOString()
    };
    mockApplications.push(newApp);
    return newApp;
  },

  async updateApplication(id: string, data: Partial<CreateApplicationRequest>): Promise<Application> {
    await delay(500);
    const appIndex = mockApplications.findIndex(app => app.id === id);
    if (appIndex === -1) throw new Error('Application not found');
    
    const updatedApp = {
      ...mockApplications[appIndex],
      ...data,
    };
    mockApplications[appIndex] = updatedApp;
    return updatedApp;
  },

  async deleteApplication(id: string): Promise<void> {
    await delay(300);
    const index = mockApplications.findIndex(app => app.id === id);
    if (index === -1) throw new Error('Application not found');
    mockApplications.splice(index, 1);
  },

  // Permissions
  async getPermissions(): Promise<Permission[]> {
    await delay(200);
    return [...mockPermissions];
  },

  // Dashboard stats
  async getDashboardStats() {
    await delay(200);
    return {
      users: mockUsers.length,
      activeUsers: mockUsers.filter(u => u.status === 'active').length,
      roles: mockRoles.length,
      groups: mockGroups.length,
      applications: mockApplications.length,
      activeApplications: mockApplications.filter(a => a.status === 'active').length,
    };
  }
};