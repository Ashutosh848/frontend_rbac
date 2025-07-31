import React, { useState, useEffect } from 'react';
import { Role, Group, Permission, CreateRoleRequest } from '../../types';
import { mockApi } from '../../services/mockApi';

interface RoleFormProps {
  role?: Role;
  onSave: () => void;
  onCancel: () => void;
}

export const RoleForm: React.FC<RoleFormProps> = ({ role, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupIds: [] as string[],
    permissionIds: [] as string[]
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadGroups();
    loadPermissions();
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        groupIds: role.groups.map(g => g.id),
        permissionIds: role.permissions.map(p => p.id)
      });
    }
  }, [role]);

  const loadGroups = async () => {
    try {
      const data = await mockApi.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await mockApi.getPermissions();
      setPermissions(data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.groupIds.length === 0) {
      newErrors.groupIds = 'At least one group is required';
    }

    if (formData.permissionIds.length === 0) {
      newErrors.permissionIds = 'At least one permission is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (role) {
        await mockApi.updateRole(role.id, formData);
      } else {
        await mockApi.createRole(formData as CreateRoleRequest);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save role:', error);
      setErrors({ submit: 'Failed to save role. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (groupId: string, checked: boolean) => {
    const newGroupIds = checked
      ? [...formData.groupIds, groupId]
      : formData.groupIds.filter(id => id !== groupId);
    
    setFormData(prev => ({ ...prev, groupIds: newGroupIds }));
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const newPermissionIds = checked
      ? [...formData.permissionIds, permissionId]
      : formData.permissionIds.filter(id => id !== permissionId);
    
    setFormData(prev => ({ ...prev, permissionIds: newPermissionIds }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter role name"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Describe the role and its purpose"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Groups *
        </label>
        <div className={`border rounded-md p-3 max-h-32 overflow-y-auto ${
          errors.groupIds ? 'border-red-300' : 'border-gray-300'
        }`}>
          {groups.map(group => (
            <label key={group.id} className="flex items-center py-1">
              <input
                type="checkbox"
                checked={formData.groupIds.includes(group.id)}
                onChange={(e) => handleGroupChange(group.id, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">
                <span className="font-medium">{group.name}</span>
                <span className="text-gray-500 ml-2">{group.description}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.groupIds && <p className="mt-1 text-sm text-red-600">{errors.groupIds}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permissions *
        </label>
        <div className={`border rounded-md p-3 max-h-40 overflow-y-auto ${
          errors.permissionIds ? 'border-red-300' : 'border-gray-300'
        }`}>
          {permissions.map(permission => (
            <label key={permission.id} className="flex items-start py-1">
              <input
                type="checkbox"
                checked={formData.permissionIds.includes(permission.id)}
                onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                className="mr-2 mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">{permission.name}</span>
                <span className="text-gray-500 ml-2">
                  {permission.action} on {permission.resource}
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.permissionIds && <p className="mt-1 text-sm text-red-600">{errors.permissionIds}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : (role ? 'Update' : 'Create')} Role
        </button>
      </div>
    </form>
  );
};