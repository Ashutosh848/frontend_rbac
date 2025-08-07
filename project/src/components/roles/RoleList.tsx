import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { Role } from '../../types';
import { fetchRoles, deleteRole } from '../../services/api';
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
      const data = await fetchRoles();
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
      await deleteRole(role.id);
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

  // Helper function to format date with more options
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      // Format with more detail - you can customize this
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
      render: (role: Role) => {
        const groups = role.groups || [];
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500">
              {groups.length > 0 ? (
                <>
                  {groups.slice(0, 2).map(g => g.name).join(', ')}
                  {groups.length > 2 && ` +${groups.length - 2} more`}
                </>
              ) : (
                'No groups assigned'
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (role: Role) => {
        const permissions = role.permissions || [];
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500">
              {permissions.length > 0 ? (
                <>
                  {permissions.slice(0, 2).map(p => p.name).join(', ')}
                  {permissions.length > 2 && ` +${permissions.length - 2} more`}
                </>
              ) : (
                'No permissions assigned'
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (role: Role) => {
        // Try both camelCase and snake_case field names
        const createdAt = (role as any).created_at || role.createdAt || (role as any).createdAt;
        
        return (
          <div className="text-sm text-gray-600">
            <div>{formatDate(createdAt)}</div>
            {/* Optional: Show relative time as well */}
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

  // Helper function to get relative time (e.g., "2 hours ago")
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