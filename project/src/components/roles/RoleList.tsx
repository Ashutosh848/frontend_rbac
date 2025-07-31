import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { Role } from '../../types';
import { mockApi } from '../../services/mockApi';
import { Table } from '../common/Table';
import { SearchInput } from '../common/SearchInput';
import { RoleForm } from './RoleForm';
import { Modal } from '../common/Modal';

export const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    const filtered = roles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredRoles(filtered);
  }, [roles, searchQuery]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await mockApi.getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
      showNotification('error', 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteRole = async (role: Role) => {
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;
    
    try {
      await mockApi.deleteRole(role.id);
      setRoles(roles.filter(r => r.id !== role.id));
      showNotification('success', 'Role deleted successfully');
    } catch (error) {
      console.error('Failed to delete role:', error);
      showNotification('error', 'Failed to delete role');
    }
  };

  const handleRoleSaved = () => {
    loadRoles();
    setShowCreateModal(false);
    setEditingRole(null);
    showNotification('success', editingRole ? 'Role updated successfully' : 'Role created successfully');
  };

  const columns = [
    {
      key: 'name',
      header: 'Role Name',
      render: (role: Role) => (
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{role.name}</div>
            <div className="text-sm text-gray-500">{role.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'groups',
      header: 'Groups',
      render: (role: Role) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {role.groups.length} group{role.groups.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500">
            {role.groups.slice(0, 2).map(g => g.name).join(', ')}
            {role.groups.length > 2 && ` +${role.groups.length - 2} more`}
          </div>
        </div>
      )
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (role: Role) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500">
            {role.permissions.slice(0, 2).map(p => p.name).join(', ')}
            {role.permissions.length > 2 && ` +${role.permissions.length - 2} more`}
          </div>
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (role: Role) => (
        <div className="text-sm text-gray-600">
          {new Date(role.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (role: Role) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingRole(role)}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteRole(role)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
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
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
            <p className="text-gray-600 mt-1">Define access roles and permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </button>
        </div>

        <div className="mt-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search roles by name or description..."
            className="max-w-md"
          />
        </div>
      </div>

      <Table
        data={filteredRoles}
        columns={columns}
        loading={loading}
        emptyMessage="No roles found"
      />

      {/* Create Role Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Role"
        size="lg"
      >
        <RoleForm
          onSave={handleRoleSaved}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        title="Edit Role"
        size="lg"
      >
        {editingRole && (
          <RoleForm
            role={editingRole}
            onSave={handleRoleSaved}
            onCancel={() => setEditingRole(null)}
          />
        )}
      </Modal>
    </div>
  );
};