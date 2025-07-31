import React, { useState, useEffect } from 'react';
import { Group, Application, CreateGroupRequest } from '../../types';
import { mockApi } from '../../services/mockApi';

interface GroupFormProps {
  group?: Group;
  onSave: () => void;
  onCancel: () => void;
}

export const GroupForm: React.FC<GroupFormProps> = ({ group, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    applicationIds: [] as string[]
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadApplications();
    if (group) {
      setFormData({
        name: group.name,
        description: group.description,
        applicationIds: group.applications.map(a => a.id)
      });
    }
  }, [group]);

  const loadApplications = async () => {
    try {
      const data = await mockApi.getApplications();
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.applicationIds.length === 0) {
      newErrors.applicationIds = 'At least one application is required';
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
      if (group) {
        await mockApi.updateGroup(group.id, formData);
      } else {
        await mockApi.createGroup(formData as CreateGroupRequest);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save group:', error);
      setErrors({ submit: 'Failed to save group. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationChange = (applicationId: string, checked: boolean) => {
    const newApplicationIds = checked
      ? [...formData.applicationIds, applicationId]
      : formData.applicationIds.filter(id => id !== applicationId);
    
    setFormData(prev => ({ ...prev, applicationIds: newApplicationIds }));
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
          Group Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter group name"
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
          placeholder="Describe the group and its purpose"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Applications *
        </label>
        <div className={`border rounded-md p-3 max-h-40 overflow-y-auto ${
          errors.applicationIds ? 'border-red-300' : 'border-gray-300'
        }`}>
          {applications.map(application => (
            <label key={application.id} className="flex items-start py-2 border-b border-gray-100 last:border-b-0">
              <input
                type="checkbox"
                checked={formData.applicationIds.includes(application.id)}
                onChange={(e) => handleApplicationChange(application.id, e.target.checked)}
                className="mr-3 mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{application.name}</div>
                <div className="text-xs text-gray-500">{application.description}</div>
                {application.url && (
                  <div className="text-xs text-blue-600 mt-1">{application.url}</div>
                )}
              </div>
            </label>
          ))}
        </div>
        {errors.applicationIds && <p className="mt-1 text-sm text-red-600">{errors.applicationIds}</p>}
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
          {loading ? 'Saving...' : (group ? 'Update' : 'Create')} Group
        </button>
      </div>
    </form>
  );
};