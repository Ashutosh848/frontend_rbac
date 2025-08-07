import React, { useState, useEffect } from 'react';
import { Group, Application, CreateGroupRequest } from '../../types';
import { fetchApplications, createGroup, updatationGroup, isAuthenticated } from '../../services/api';

interface GroupFormProps {
  group?: Group;
  onSave: (groupData: any) => void;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  description?: string;
  applicationIds?: string;
  submit?: string;
}

export const GroupForm: React.FC<GroupFormProps> = ({ group, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    applicationIds: [] as number[]
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      setErrors({ submit: 'You are not authenticated. Please log in again.' });
      return;
    }

    loadApplications();
    
    if (group) {
      setFormData({
        name: group.name,
        description: group.description,
        applicationIds: group.applications?.map(a => a.id) || []
      });
    }
  }, [group]);

  const loadApplications = async () => {
    try {
      setLoadingApplications(true);
      const data = await fetchApplications();
      console.log('Loaded applications for group form:', data);
      setApplications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load applications:', error);
      let errorMessage = 'Failed to load applications. Please try again.';
      if (error.message?.includes('authentication')) {
        errorMessage = 'Your session has expired. Please log in again.';
      }
      setErrors({ submit: errorMessage });
    } finally {
      setLoadingApplications(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Group name must be at least 3 characters long';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Group name must be less than 100 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Applications validation
    if (formData.applicationIds.length === 0) {
      newErrors.applicationIds = 'At least one application must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const parseApiError = (error: any): FormErrors => {
    const fieldErrors: FormErrors = {};
    
    console.log('Parsing API error:', error);
    
    // Check if the error has response data with validation errors
    if (error.response?.data) {
      const errorData = error.response.data;
      console.log('Error data:', errorData);
      
      // Handle different error structures
      let validationErrors = null;
      
      if (errorData.errors) {
        validationErrors = errorData.errors;
      } else if (errorData.detail) {
        // Single error message
        fieldErrors.submit = errorData.detail;
        return fieldErrors;
      } else if (typeof errorData === 'object') {
        validationErrors = errorData;
      }
      
      if (validationErrors && typeof validationErrors === 'object') {
        console.log('Validation errors:', validationErrors);
        
        // Map backend field names to frontend field names
        const fieldMapping = {
          'name': 'name',
          'description': 'description',
          'application_ids': 'applicationIds',
          'applications': 'applicationIds',
          'applicationIds': 'applicationIds'
        };
        
        Object.keys(validationErrors).forEach(backendField => {
          const frontendField = fieldMapping[backendField as keyof typeof fieldMapping];
          console.log(`Mapping ${backendField} -> ${frontendField}`);
          
          if (frontendField) {
            const errorValue = validationErrors[backendField];
            if (Array.isArray(errorValue)) {
              fieldErrors[frontendField as keyof FormErrors] = errorValue[0];
            } else if (typeof errorValue === 'string') {
              fieldErrors[frontendField as keyof FormErrors] = errorValue;
            }
          }
        });
        
        console.log('Mapped field errors:', fieldErrors);
        
        // If we found field-specific errors, return them
        if (Object.keys(fieldErrors).length > 0) {
          return fieldErrors;
        }
      }
    }
    
    // Check if error message contains validation info
    if (error.message && typeof error.message === 'string') {
      try {
        // Try to parse JSON from error message
        const messageMatch = error.message.match(/Validation failed: (.+)$/);
        if (messageMatch) {
          const validationData = JSON.parse(messageMatch[1]);
          if (validationData.errors && validationData.errors.name) {
            fieldErrors.name = Array.isArray(validationData.errors.name) 
              ? validationData.errors.name[0] 
              : validationData.errors.name;
            return fieldErrors;
          }
        }
      } catch (parseError) {
        console.log('Could not parse error message as JSON');
      }
    }
    
    // Default error messages based on status codes
    if (error.response?.status === 400) {
      fieldErrors.submit = 'Please check your input and try again.';
    } else if (error.response?.status === 409) {
      fieldErrors.name = 'A group with this name already exists. Please choose a different name.';
    } else if (error.response?.status === 422) {
      fieldErrors.submit = 'Invalid data provided. Please check your input.';
    } else if (error.response?.status === 401) {
      fieldErrors.submit = 'Your session has expired. Please log in again.';
    } else if (error.response?.status === 403) {
      fieldErrors.submit = 'You do not have permission to perform this action.';
    } else if (error.response?.status >= 500) {
      fieldErrors.submit = 'Server error occurred. Please try again later.';
    } else {
      fieldErrors.submit = error.message || 'An unexpected error occurred. Please try again.';
    }
    
    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    setErrors({});
    
    // Check authentication before validation
    if (!isAuthenticated()) {
      setErrors({ submit: 'Your session has expired. Please log in again.' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        applicationIds: formData.applicationIds
      };

      console.log('Submitting group data:', submitData);

      // if (group) {
      //   await updatationGroup(group.id, submitData);
      // } else {
      //   await creationGroup(submitData as CreateGroupRequest);
      // }
      
      // Success - call onSave callback
      onSave(submitData);
    } catch (error: any) {
      console.error('Failed to save group:', error);
      
      // Parse and set the appropriate errors
      const parsedErrors = parseApiError(error);
      setErrors(parsedErrors);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationChange = (applicationId: number, checked: boolean) => {
    const newApplicationIds = checked
      ? [...formData.applicationIds, applicationId]
      : formData.applicationIds.filter(id => id !== applicationId);
    
    setFormData(prev => ({ ...prev, applicationIds: newApplicationIds }));
    
    // Clear application selection error when user makes a selection
    if (errors.applicationIds && newApplicationIds.length > 0) {
      setErrors(prev => ({ ...prev, applicationIds: undefined }));
    }
  };

  const isFormValid = formData.name.trim() && 
                     formData.description.trim() && 
                     formData.applicationIds.length > 0 && 
                     !loading &&
                     !loadingApplications;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {group ? 'Edit Group' : 'Create New Group'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{errors.submit}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Group Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange('name')}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter a unique group name"
            maxLength={100}
            disabled={loading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={handleInputChange('description')}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical ${
              errors.description ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe the group and its purpose"
            maxLength={500}
            disabled={loading}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.description ? (
              <p className="text-sm text-red-600 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.description}
              </p>
            ) : (
              <span></span>
            )}
            <span className="text-sm text-gray-500">
              {formData.description.length}/500
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Applications *
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Select the applications this group will have access to.
          </p>
          
          {loadingApplications ? (
            <div className="border border-gray-300 rounded-md p-4 text-center">
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading applications...
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="border border-gray-300 rounded-md p-4 text-center text-gray-500">
              No applications available. Please create applications first.
            </div>
          ) : (
            <div className={`border rounded-md p-3 max-h-64 overflow-y-auto ${
              errors.applicationIds ? 'border-red-300' : 'border-gray-300'
            }`}>
              <div className="space-y-3">
                {applications.map(application => (
                  <label key={application.id} className="flex items-start p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.applicationIds.includes(application.id)}
                      onChange={(e) => handleApplicationChange(application.id, e.target.checked)}
                      className="mr-3 mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={loading}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{application.name}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{application.description}</div>
                      {application.url && (
                        <div className="text-xs text-blue-600 mt-1 truncate" title={application.url}>
                          {application.url}
                        </div>
                      )}
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          application.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : application.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {application.status}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {errors.applicationIds && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.applicationIds}
            </p>
          )}
          
          {formData.applicationIds.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {formData.applicationIds.length} application{formData.applicationIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Saving...' : (group ? 'Update Group' : 'Create Group')}
          </button>
        </div>
      </form>
    </div>
  );
};