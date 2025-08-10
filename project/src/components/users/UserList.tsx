import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Mail, Search, X, Check } from 'lucide-react';
import { User } from '../../types/types';
import { fetchUsers, updateUser, fetchRoles, fetchGroups } from '../../services/api';
import axios from 'axios';
import { Table } from '../common/Table';
import { StatusBadge } from '../common/StatusBadge';
import { SearchInput } from '../common/SearchInput';
import { UserForm } from './UserForm';
import { Modal } from '../common/Modal';

const API_BASE = 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

interface Role {
  id: number;
  name?: string;
  title?: string;
  role_name?: string;
  [key: string]: any;
}

interface Group {
  id: number;
  name?: string;
  title?: string;
  group_name?: string;
  [key: string]: any;
}

interface ApiUser {
  id?: number;
  name: string;
  email: string;
  password?: string;
  status: 'active' | 'inactive';
  roles: string[];
  group_ids?: number[];
  created_at?: string;
}

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<ApiUser | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData, groupsData] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchGroups()
      ]);

      console.log('Raw users response:', usersData);
      console.log('Raw roles response:', rolesData);
      console.log('Raw groups response:', groupsData);
      
      let usersArray: ApiUser[] = [];
      if (usersData && typeof usersData === 'object' && Array.isArray(usersData.results)) {
        usersArray = usersData.results;
      } else if (Array.isArray(usersData)) {
        usersArray = usersData;
      } else {
        console.error('Users data is not in expected format:', usersData);
        usersArray = [];
      }

      let rolesArray: Role[] = [];
      if (Array.isArray(rolesData)) {
        rolesArray = rolesData;
      } else if (rolesData && typeof rolesData === 'object' && Array.isArray(rolesData.results)) {
        rolesArray = rolesData.results;
      } else {
        console.error('Roles data is not in expected format:', rolesData);
        rolesArray = [];
      }

      let groupsArray: Group[] = [];
      if (Array.isArray(groupsData)) {
        groupsArray = groupsData;
      } else if (groupsData && typeof groupsData === 'object' && Array.isArray(groupsData.results)) {
        groupsArray = groupsData.results;
      } else {
        console.error('Groups data is not in expected format:', groupsData);
        groupsArray = [];
      }
      
      setUsers(usersArray);
      setRoles(rolesArray);
      setGroups(groupsArray);
      
      console.log('Processed users:', usersArray);
      console.log('Processed roles:', rolesArray);
      console.log('Processed groups:', groupsArray);
    } catch (error) {
      console.error('Failed to load data:', error);
      showNotification('error', 'Failed to load data');
      setUsers([]);
      setRoles([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper function to format date (same as RoleList)
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  // Helper function to get relative time (same as RoleList)
  const getRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return `${Math.floor(diffInSeconds / 604800)}w ago`;
    } catch {
      return '';
    }
  };

  const handleToggleStatus = async (user: ApiUser) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      const updatedUserData = { 
        ...user, 
        status: newStatus,
        role_ids: user.roles?.map(roleName => {
          const role = roles.find(r => (r.name || r.title || r.role_name) === roleName);
          return role?.id || 0;
        }).filter(id => id > 0) || [],
        group_ids: user.group_ids || []
      };
      
      await updateUser(user.id!, updatedUserData);
      
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      showNotification('success', `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      showNotification('error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: ApiUser) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) return;
    
    try {
      await axios.delete(`${API_BASE}/users/${user.id}/`, getAuthHeaders());
      setUsers(users.filter(u => u.id !== user.id));
      showNotification('success', 'User deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      showNotification('error', 'Failed to delete user');
    }
  };

  const handleSendInvite = async (user: ApiUser) => {
    try {
      await axios.post(`${API_BASE}/users/${user.id}/send-invite/`, {}, getAuthHeaders());
      showNotification('success', 'Invite email sent successfully!');
    } catch (error) {
      console.error('Failed to send invite:', error);
      showNotification('error', 'Failed to send invite');
    }
  };

  const handleUserSaved = () => {
    loadData();
    setShowCreateModal(false);
    setEditingUser(null);
    showNotification('success', editingUser ? 'User updated successfully' : 'User created successfully');
  };

  const handleManageRoles = (user: ApiUser) => {
    setSelectedUserForRoles(user);
    setShowRoleModal(true);
  };

  const handleRoleToggle = async (roleName: string) => {
    if (!selectedUserForRoles) return;

    try {
      const currentRoles = selectedUserForRoles.roles || [];
      const updatedRoles = currentRoles.includes(roleName)
        ? currentRoles.filter(r => r !== roleName)
        : [...currentRoles, roleName];

      const updatedUserData = {
        ...selectedUserForRoles,
        roles: updatedRoles,
        role_ids: updatedRoles.map(roleName => {
          const role = roles.find(r => (r.name || r.title || r.role_name) === roleName);
          return role?.id || 0;
        }).filter(id => id > 0),
        group_ids: selectedUserForRoles.group_ids || []
      };

      await updateUser(selectedUserForRoles.id!, updatedUserData);
      
      // Update local state
      const updatedUsers = users.map(u => 
        u.id === selectedUserForRoles.id 
          ? { ...u, roles: updatedRoles }
          : u
      );
      
      setUsers(updatedUsers);
      setSelectedUserForRoles({ ...selectedUserForRoles, roles: updatedRoles });
      
      showNotification('success', `Role ${currentRoles.includes(roleName) ? 'removed' : 'added'} successfully`);
    } catch (error) {
      console.error('Failed to update user roles:', error);
      showNotification('error', 'Failed to update user roles');
    }
  };

  const getGroupName = (groupId: number): string => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      return group.name || group.title || group.group_name || `Group ${groupId}`;
    }
    return `Group ${groupId}`;
  };

  const getGroupNames = (groupIds: number[] = []) => {
    return groupIds.length > 0 ? groupIds.map(getGroupName).join(', ') : 'No groups';
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user: ApiUser) => (
        <div>
          <div className="font-medium text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      )
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (user: ApiUser) => (
        <div>
          <div className="flex flex-wrap gap-1 mb-2">
            {(user.roles || []).map((roleName, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {roleName}
              </span>
            ))}
            {(!user.roles || user.roles.length === 0) && (
              <span className="text-sm text-gray-500">No roles</span>
            )}
          </div>
          <button
            onClick={() => handleManageRoles(user)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage Roles
          </button>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: ApiUser) => <StatusBadge status={user.status} />
    },
    {
      key: 'created',
      header: 'Created',
      render: (user: ApiUser) => {
        const createdAt = user.created_at;
        
        return (
          <div className="text-sm text-gray-600">
            <div>{formatDate(createdAt)}</div>
            {createdAt && (
              <div className="text-xs text-gray-400 mt-1">
                {getRelativeTime(createdAt)}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: ApiUser) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleToggleStatus(user)}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {user.status === 'active' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          <button
            onClick={() => setEditingUser(user)}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteUser(user)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => handleSendInvite(user)}
            className="text-gray-400 hover:text-green-600 transition-colors"
            title="Send Invite"
          >
            <Mail size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600 mt-1">Manage user accounts and access permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </button>
        </div>

        <div className="mt-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search users by name or email..."
            className="max-w-md"
          />
        </div>
      </div>

      <Table
        data={filteredUsers}
        columns={columns}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="lg"
      >
        <UserForm
          onSave={handleUserSaved}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        size="lg"
      >
        {editingUser && (
          <UserForm
            user={editingUser as any}
            onSave={handleUserSaved}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </Modal>

      {/* Role Management Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={`Manage Roles - ${selectedUserForRoles?.name}`}
        size="md"
      >
        {selectedUserForRoles && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Select or deselect roles for {selectedUserForRoles.name}
            </p>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {roles.map((role) => {
                const roleName = role.name || role.title || role.role_name || `Role ${role.id}`;
                const isAssigned = (selectedUserForRoles.roles || []).includes(roleName);
                
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRoleToggle(roleName)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                        isAssigned 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isAssigned && <Check size={12} />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{roleName}</div>
                        {(role as any).description && (
                          <div className="text-sm text-gray-500">{(role as any).description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {roles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No roles available
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};