import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Mail, Search } from 'lucide-react';
import { User } from '../../types';
import { mockApi } from '../../services/mockApi';
import { Table } from '../common/Table';
import { StatusBadge } from '../common/StatusBadge';
import { SearchInput } from '../common/SearchInput';
import { UserForm } from './UserForm';
import { Modal } from '../common/Modal';

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roles.some(role => role.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await mockApi.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      showNotification('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const updatedUser = await mockApi.toggleUserStatus(user.id);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      showNotification('success', `User ${updatedUser.status === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      showNotification('error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) return;
    
    try {
      await mockApi.deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      showNotification('success', 'User deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      showNotification('error', 'Failed to delete user');
    }
  };

  const handleUserSaved = () => {
    loadUsers();
    setShowCreateModal(false);
    setEditingUser(null);
    showNotification('success', editingUser ? 'User updated successfully' : 'User created successfully');
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => (
        <div>
          <div className="font-medium text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      )
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (user: User) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map(role => (
            <span key={role.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {role.name}
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'groups',
      header: 'Groups',
      render: (user: User) => (
        <div className="text-sm text-gray-600">
          {user.groups.length > 0 ? user.groups.map(g => g.name).join(', ') : 'No groups'}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => <StatusBadge status={user.status} />
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (user: User) => (
        <div className="text-sm text-gray-600">
          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
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
            onClick={() => showNotification('success', 'Invite email sent!')}
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
            placeholder="Search users by name, email, or role..."
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
            user={editingUser}
            onSave={handleUserSaved}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </Modal>
    </div>
  );
};