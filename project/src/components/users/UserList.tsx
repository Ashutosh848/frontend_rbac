import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Mail, Search } from 'lucide-react';
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
  [key: string]: any; // Allow other properties
}

interface Group {
  id: number;
  name?: string;
  title?: string;
  group_name?: string;
  [key: string]: any; // Allow other properties
}

// Updated User interface to match API response
interface ApiUser {
  id?: number;
  name: string;
  email: string;
  password?: string;
  status: 'active' | 'inactive';
  roles: string[]; // Array of role names from API
  group_ids?: number[]; // Keep this if groups still use IDs
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
      // Load users, roles, and groups concurrently
      const [usersData, rolesData, groupsData] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchGroups()
      ]);

      console.log('Raw users response:', usersData);
      console.log('Raw roles response:', rolesData);
      console.log('Raw groups response:', groupsData);
      
      // Handle paginated response for users
      let usersArray: ApiUser[] = [];
      if (usersData && typeof usersData === 'object' && Array.isArray(usersData.results)) {
        usersArray = usersData.results;
      } else if (Array.isArray(usersData)) {
        usersArray = usersData;
      } else {
        console.error('Users data is not in expected format:', usersData);
        usersArray = [];
      }

      // Handle roles data with detailed logging
      let rolesArray: Role[] = [];
      if (Array.isArray(rolesData)) {
        rolesArray = rolesData;
      } else if (rolesData && typeof rolesData === 'object' && Array.isArray(rolesData.results)) {
        rolesArray = rolesData.results;
      } else {
        console.error('Roles data is not in expected format:', rolesData);
        rolesArray = [];
      }

      // Handle groups data with detailed logging
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

  const handleToggleStatus = async (user: ApiUser) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      // Convert ApiUser back to the format expected by updateUser API
      const updatedUserData = { 
        ...user, 
        status: newStatus,
        // Convert role names back to role_ids if your API expects that
        role_ids: user.roles?.map(roleName => {
          const role = roles.find(r => (r.name || r.title || r.role_name) === roleName);
          return role?.id || 0;
        }).filter(id => id > 0) || [],
        group_ids: user.group_ids || []
      };
      
      await updateUser(user.id!, updatedUserData);
      
      // Update local state
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
    loadData(); // Reload all data including users, roles, and groups
    setShowCreateModal(false);
    setEditingUser(null);
    showNotification('success', editingUser ? 'User updated successfully' : 'User created successfully');
  };

  // Create a mapping from group ID to group name (if needed)
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
        <div className="flex flex-wrap gap-1">
          {(user.roles || []).map((roleName, index) => (
            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {roleName}
            </span>
          ))}
          {(!user.roles || user.roles.length === 0) && (
            <span className="text-sm text-gray-500">No roles</span>
          )}
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
      render: (user: ApiUser) => (
        <div className="text-sm text-gray-600">
          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
        </div>
      )
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
            user={editingUser as any} // You may need to convert this back to User type
            onSave={handleUserSaved}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </Modal>
    </div>
  );
};