import React, { useState, useEffect } from 'react';
import { User, Role, Group } from '../../types/types';
import { fetchRoles, fetchGroups, createUser, updateUser } from '../../services/api';

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
    status: 'active' as 'active' | 'inactive',
    role_ids: [] as number[],
    group_ids: [] as number[]
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRoles();
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't pre-fill password for editing
        status: user.status,
        role_ids: user.role_ids,
        group_ids: user.group_ids
      });
    }
  }, [user]);

  useEffect(() => {
    loadRoles();
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't pre-fill password for editing
        status: user.status,
        role_ids: user.role_ids || [],  // <-- fallback added here
        group_ids: user.group_ids || [] // <-- and here
      });
    }
  }, [user]);


  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const data = await fetchRoles();
      console.log('Raw roles response:', data);
      
      // Handle paginated response (Django REST Framework format)
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        setRoles(data.results);
        console.log('Set roles from paginated response:', data.results.length, 'roles');
        // Clear any previous errors
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.roles;
          return newErrors;
        });
      } 
      // Handle direct array response
      else if (Array.isArray(data)) {
        setRoles(data);
        console.log('Set roles from direct array:', data.length, 'roles');
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.roles;
          return newErrors;
        });
      }
      else {
        console.error('Roles data is not in expected format:', data);
        setRoles([]);
        setErrors(prev => ({ ...prev, roles: `Unexpected data format. Received: ${typeof data}` }));
      }
    } catch (error: any) {
      console.error('Failed to load roles:', error);
      console.error('Error response:', error.response?.data);
      setRoles([]);
      setErrors(prev => ({ ...prev, roles: `Failed to load roles: ${error.response?.status || 'Network error'}` }));
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadGroupsForRoles = async (roleIds: number[]) => {
    try {
      const data = await fetchGroups();
      console.log('Raw groups response:', data);
      
      let allGroups: Group[] = [];
      
      // Handle paginated response (Django REST Framework format)
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        allGroups = data.results;
      } 
      // Handle direct array response
      else if (Array.isArray(data)) {
        allGroups = data;
      } else {
        console.error('Groups data is not in expected format:', data);
        setAvailableGroups([]);
        return;
      }

      // Filter groups that are available to the selected roles
      const filteredGroups = allGroups.filter(group =>
        roleIds.some(roleId => group.role_ids.includes(roleId))
      );
      setAvailableGroups(filteredGroups);
      console.log('Filtered groups for roles:', filteredGroups.length, 'groups');
    } catch (error) {
      console.error('Failed to load groups:', error);
      setAvailableGroups([]);
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

    if (formData.role_ids.length === 0) {
      newErrors.role_ids = 'At least one role is required';
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
        // Update existing user
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't send empty password
        }
        await updateUser(user.id!, updateData);
      } else {
        // Create new user
        await createUser(formData);
      }
      onSave();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      let errorMessage = 'Failed to save user. Please try again.';
      
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to perform this action.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleId: number, checked: boolean) => {
    const newRoleIds = checked
      ? [...formData.role_ids, roleId]
      : formData.role_ids.filter(id => id !== roleId);
    
    setFormData(prev => ({ ...prev, role_ids: newRoleIds }));
  };

  const handleGroupChange = (groupId: number, checked: boolean) => {
    const newGroupIds = checked
      ? [...formData.group_ids, groupId]
      : formData.group_ids.filter(id => id !== groupId);
    
    setFormData(prev => ({ ...prev, group_ids: newGroupIds }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {errors.roles && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          {errors.roles}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Roles *
        </label>
        <div className={`border rounded-md p-3 max-h-32 overflow-y-auto ${
          errors.role_ids ? 'border-red-300' : 'border-gray-300'
        }`}>
          {roles.length > 0 ? (
            roles.map(role => (
              <label key={role.id} className="flex items-center py-1">
                <input
                  type="checkbox"
                  checked={formData.role_ids.includes(role.id)}
                  onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-gray-500 ml-2">{role.description}</span>
                </span>
              </label>
            ))
          ) : (
            <div className="text-gray-500 text-sm py-2">
              {loadingRoles ? 'Loading roles...' : (errors.roles ? 'Error loading roles' : 'No roles available')}
            </div>
          )}
        </div>
        {errors.role_ids && <p className="mt-1 text-sm text-red-600">{errors.role_ids}</p>}
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
                  checked={formData.group_ids.includes(group.id)}
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