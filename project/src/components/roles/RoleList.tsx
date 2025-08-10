import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Check } from 'lucide-react';
import { Role } from '../../types';
import { fetchRoles, deleteRole, updateRole, fetchGroups } from '../../services/api';
import { Table } from '../common/Table';
import { SearchInput } from '../common/SearchInput';
import { RoleForm } from './RoleForm';
import { Modal } from '../common/Modal';

interface Group {
  id: number;
  name?: string;
  title?: string;
  group_name?: string;
  description?: string;
  [key: string]: any;
}

export const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedRoleForGroups, setSelectedRoleForGroups] = useState<Role | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = roles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredRoles(filtered);
  }, [roles, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load roles and groups concurrently
      const [rolesData, groupsData] = await Promise.all([
        fetchRoles(),
        fetchGroups()
      ]);

      console.log('Raw roles response:', rolesData);
      console.log('Raw groups response:', groupsData);
      
      // Handle roles data
      let rolesArray: Role[] = [];
      if (Array.isArray(rolesData)) {
        rolesArray = rolesData;
      } else if (rolesData && typeof rolesData === 'object' && Array.isArray(rolesData.results)) {
        rolesArray = rolesData.results;
      } else {
        console.error('Roles data is not in expected format:', rolesData);
        rolesArray = [];
      }

      // Handle groups data
      let groupsArray: Group[] = [];
      if (Array.isArray(groupsData)) {
        groupsArray = groupsData;
      } else if (groupsData && typeof groupsData === 'object' && Array.isArray(groupsData.results)) {
        groupsArray = groupsData.results;
      } else {
        console.error('Groups data is not in expected format:', groupsData);
        groupsArray = [];
      }
      
      setRoles(rolesArray);
      setGroups(groupsArray);
      
      console.log('Processed roles:', rolesArray);
      console.log('Processed groups:', groupsArray);
    } catch (error) {
      console.error('Failed to load data:', error);
      showNotification('error', 'Failed to load data');
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
    loadData(); // Reload all data including roles and groups
    setShowCreateModal(false);
    setEditingRole(null);
    showNotification('success', editingRole ? 'Role updated successfully' : 'Role created successfully');
  };

  const handleManageGroups = (role: Role) => {
    setSelectedRoleForGroups(role);
    setShowGroupModal(true);
  };

  const handleGroupToggle = async (groupId: number) => {
    if (!selectedRoleForGroups) return;

    try {
      // Get current group IDs from the role
      const currentGroupIds = (selectedRoleForGroups.groups || []).map(g => g.id);
      
      // Toggle the group
      const updatedGroupIds = currentGroupIds.includes(groupId)
        ? currentGroupIds.filter(id => id !== groupId)
        : [...currentGroupIds, groupId];

      // Prepare the update data - you might need to adjust this based on your API structure
      const updatedRoleData = {
        name: selectedRoleForGroups.name,
        description: selectedRoleForGroups.description,
        group_ids: updatedGroupIds,
        // Include any other required fields based on your API
      };

      await updateRole(selectedRoleForGroups.id, updatedRoleData);
      
      // Update local state - get the updated groups
      const updatedGroups = groups.filter(g => updatedGroupIds.includes(g.id));
      const updatedRole = {
        ...selectedRoleForGroups,
        groups: updatedGroups
      };
      
      // Update the roles list
      const updatedRoles = roles.map(r => 
        r.id === selectedRoleForGroups.id ? updatedRole : r
      );
      
      setRoles(updatedRoles);
      setSelectedRoleForGroups(updatedRole);
      
      showNotification('success', `Group ${currentGroupIds.includes(groupId) ? 'removed' : 'assigned'} successfully`);
    } catch (error) {
      console.error('Failed to update role groups:', error);
      showNotification('error', 'Failed to update role groups');
    }
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
          <div className="flex flex-wrap gap-1 mb-2">
            {(role.groups || []).map((group, index) => {
              const groupName = group.name || group.title || group.group_name || `Group ${group.id}`;
              return (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {groupName}
                </span>
              );
            })}
            {(!role.groups || role.groups.length === 0) && (
              <span className="text-sm text-gray-500">No groups</span>
            )}
          </div>
          <button
            onClick={() => handleManageGroups(role)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage Groups
          </button>
        </div>
      )
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

      {/* Group Management Modal */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={`Manage Groups - ${selectedRoleForGroups?.name}`}
        size="md"
      >
        {selectedRoleForGroups && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Select or deselect groups for the "{selectedRoleForGroups.name}" role
            </p>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {groups.map((group) => {
                const groupName = group.name || group.title || group.group_name || `Group ${group.id}`;
                const isAssigned = (selectedRoleForGroups.groups || []).some(g => g.id === group.id);
                
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleGroupToggle(group.id)}
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
                        <div className="font-medium text-gray-900">{groupName}</div>
                        {group.description && (
                          <div className="text-sm text-gray-500">{group.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {groups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No groups available
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <button
                onClick={() => setShowGroupModal(false)}
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