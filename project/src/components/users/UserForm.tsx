import React, { useState, useEffect } from 'react';
import { User, Role, Group, CreateUserRequest } from '../../types';
import { mockApi } from '../../services/mockApi';

interface UserFormProps {
  user?: User;
  onSave: () => void;
  onCancel: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleIds: [] as string[],
    groupIds: [] as string[]
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRoles();
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't pre-fill password for editing
        roleIds: user.roles.map(r => r.id),
        groupIds: user.groups.map(g => g.id)
      });
    }
  }, [user]);

  useEffect(() => {
    if (formData.roleIds.length > 0) {
      loadGroupsForRoles(formData.roleIds);
    } else {
      setAvailableGroups([]);
    }
  }, [formData.roleIds]);

  const loadRoles = async () => {
    try {
      const data = await mockApi.getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadGroupsForRoles = async (roleIds: string[]) => {
    try {
      const allGroups = await mockApi.getGroups();
      // Filter groups that are available to the selected roles
      const filteredGroups = allGroups.filter(group =>
        roleIds.some(roleId => {
          const role = roles.find(r => r.id === roleId);
          return role && role.groups.some(g => g.id === group.id);
        })
      );
      setAvailableGroups(filteredGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.roleIds.length === 0) {
      newErrors.roleIds = 'At least one role is required';
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
      if (user) {
        await mockApi.updateUser(user.id, formData);
      } else {
        await mockApi.createUser(formData as CreateUserRequest);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save user:', error);
      setErrors({ submit: 'Failed to save user. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    const newRoleIds = checked
      ? [...formData.roleIds, roleId]
      : formData.roleIds.filter(id => id !== roleId);
    
    setFormData(prev => ({ ...prev, roleIds: newRoleIds }));
  };

  const handleGroupChange = (groupId: string, checked: boolean) => {
    const newGroupIds = checked
      ? [...formData.groupIds, groupId]
      : formData.groupIds.filter(id => id !== groupId);
    
    setFormData(prev => ({ ...prev, groupIds: newGroupIds }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter full name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter email address"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password {!user && '*'}
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.password ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={user ? "Leave blank to keep current password" : "Enter password"}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Roles *
        </label>
        <div className={`border rounded-md p-3 max-h-32 overflow-y-auto ${
          errors.roleIds ? 'border-red-300' : 'border-gray-300'
        }`}>
          {roles.map(role => (
            <label key={role.id} className="flex items-center py-1">
              <input
                type="checkbox"
                checked={formData.roleIds.includes(role.id)}
                onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">
                <span className="font-medium">{role.name}</span>
                <span className="text-gray-500 ml-2">{role.description}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.roleIds && <p className="mt-1 text-sm text-red-600">{errors.roleIds}</p>}
      </div>

      {availableGroups.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Groups
          </label>
          <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
            {availableGroups.map(group => (
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
          <p className="mt-1 text-xs text-gray-500">
            Available groups based on selected roles
          </p>
        </div>
      )}

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
          {loading ? 'Saving...' : (user ? 'Update' : 'Create')} User
        </button>
      </div>
    </form>
  );
};