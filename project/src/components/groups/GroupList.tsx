import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserCheck, Check } from 'lucide-react';
import { Group } from '../../types';
import { fetchGroups, createGroup, updateGroup, deleteGroup, fetchApplications } from '../../services/api';
import { Table } from '../common/Table';
import { SearchInput } from '../common/SearchInput';
import { GroupForm } from './GroupForm';
import { Modal } from '../common/Modal';

interface Application {
  id: number;
  name?: string;
  title?: string;
  app_name?: string;
  description?: string;
  [key: string]: any;
}

export const GroupList: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedGroupForApps, setSelectedGroupForApps] = useState<Group | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [groups, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load groups and applications concurrently
      const [groupsData, applicationsData] = await Promise.all([
        fetchGroups(),
        fetchApplications()
      ]);

      console.log('Raw groups response:', groupsData);
      console.log('Raw applications response:', applicationsData);
      
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

      // Handle applications data
      let applicationsArray: Application[] = [];
      if (Array.isArray(applicationsData)) {
        applicationsArray = applicationsData;
      } else if (applicationsData && typeof applicationsData === 'object' && Array.isArray(applicationsData.results)) {
        applicationsArray = applicationsData.results;
      } else {
        console.error('Applications data is not in expected format:', applicationsData);
        applicationsArray = [];
      }
      
      setGroups(groupsArray);
      setApplications(applicationsArray);
      
      console.log('Processed groups:', groupsArray);
      console.log('Processed applications:', applicationsArray);
    } catch (error) {
      console.error('Failed to load data:', error);
      showNotification('error', 'Failed to load data');
      setGroups([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!window.confirm(`Are you sure you want to delete the group "${group.name}"?`)) return;
    
    try {
      await deleteGroup(group.id);
      setGroups(groups.filter(g => g.id !== group.id));
      showNotification('success', 'Group deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete group:', error);
      showNotification('error', error.message || 'Failed to delete group');
    }
  };

  const handleGroupSaved = async (groupData: any) => {
    try {
      console.log('=== GROUP SAVE DEBUG ===');
      console.log('Saving group data:', groupData);
      console.log('GroupData keys:', Object.keys(groupData));
      console.log('application_names in groupData:', groupData.application_names);
      console.log('applications in groupData:', groupData.applications);
      console.log('editingGroup:', editingGroup);
      
      if (editingGroup) {
        // Update existing group
        console.log('Updating group with ID:', editingGroup.id);
        console.log('Update payload:', groupData);
        
        const updatedGroup = await updateGroup(editingGroup.id, groupData);
        console.log('API response for update:', updatedGroup);
        
        showNotification('success', 'Group updated successfully');
        
      } else {
        // Create new group
        console.log('Creating new group:', groupData);
        const newGroup = await createGroup(groupData);
        console.log('API response for create:', newGroup);
        
        showNotification('success', 'Group created successfully');
      }
      
      // Close modals
      setShowCreateModal(false);
      setEditingGroup(null);
      
      // Always reload groups after any operation to ensure consistency
      await loadData();
      
    } catch (error: any) {
      console.error('Failed to save group:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
      let errorMessage = 'Failed to save group';
      
      // Handle validation errors
      if (error.message && error.message.includes('Validation failed:')) {
        try {
          const validationData = JSON.parse(error.message.replace('Validation failed: ', ''));
          if (validationData.errors) {
            const fieldErrors = Object.entries(validationData.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            errorMessage = `Validation errors - ${fieldErrors}`;
          }
        } catch (parseError) {
          errorMessage = error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification('error', errorMessage);
    }
  };

  const handleManageApplications = (group: Group) => {
    setSelectedGroupForApps(group);
    setShowApplicationModal(true);
  };

  const handleApplicationToggle = async (applicationId: number) => {
    if (!selectedGroupForApps) return;

    try {
      // Get current application IDs from the group - handle multiple possible formats
      const currentAppIds = (selectedGroupForApps.applications || []).map(a => 
        typeof a === 'object' ? a.id : a
      ).concat(selectedGroupForApps.application_ids || []);
      
      // Remove duplicates
      const uniqueCurrentAppIds = [...new Set(currentAppIds)];
      
      // Toggle the application
      const updatedAppIds = uniqueCurrentAppIds.includes(applicationId)
        ? uniqueCurrentAppIds.filter(id => id !== applicationId)
        : [...uniqueCurrentAppIds, applicationId];

      // Prepare the update data - you might need to adjust this based on your API structure
      const updatedGroupData = {
        name: selectedGroupForApps.name,
        description: selectedGroupForApps.description,
        application_ids: updatedAppIds,
        // Include any other required fields based on your API
      };

      await updateGroup(selectedGroupForApps.id, updatedGroupData);
      
      // Update local state - get the updated applications
      const updatedApplications = applications.filter(a => updatedAppIds.includes(a.id));
      const updatedGroup = {
        ...selectedGroupForApps,
        applications: updatedApplications,
        application_ids: updatedAppIds,
        application_names: updatedApplications.map(a => a.name || a.title || a.app_name || `App ${a.id}`)
      };
      
      // Update the groups list
      const updatedGroups = groups.map(g => 
        g.id === selectedGroupForApps.id ? updatedGroup : g
      );
      
      setGroups(updatedGroups);
      setSelectedGroupForApps(updatedGroup);
      
      showNotification('success', `Application ${uniqueCurrentAppIds.includes(applicationId) ? 'removed' : 'assigned'} successfully`);
    } catch (error) {
      console.error('Failed to update group applications:', error);
      showNotification('error', 'Failed to update group applications');
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
      header: <span className="font-bold">Group Name</span>,
      render: (group: Group) => (
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg mr-3">
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{group.name}</div>
            <div className="text-sm text-gray-500">{group.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'applications',
      header: <span className="font-bold">Applications</span>,
      render: (group: Group) => {
        // Handle both possible response formats
        const applicationNames = group.application_names || group.applications?.map(a => a.name || a.title || a.app_name || `App ${a.id}`) || [];
        
        return (
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {applicationNames.map((appName, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {appName}
                </span>
              ))}
              {applicationNames.length === 0 && (
                <span className="text-sm text-gray-500">No applications</span>
              )}
            </div>
            <button
              onClick={() => handleManageApplications(group)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Applications
            </button>
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      header: <span className="font-bold">Created</span>,
      render: (group: Group) => {
        // Handle both created_at (API response) and createdAt (processed data)
        const createdAt = group.created_at || group.createdAt;
        
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
      header: <span className="font-bold">Actions</span>,
      render: (group: Group) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingGroup(group)}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteGroup(group)}
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
            <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-600 mt-1">Organize users and manage application access</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </button>
        </div>

        <div className="mt-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search groups by name or description..."
            className="max-w-md"
          />
        </div>
      </div>

      <Table
        data={filteredGroups}
        columns={columns}
        loading={loading}
        emptyMessage="No groups found"
      />

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Group"
        size="lg"
      >
        <GroupForm
          onSave={handleGroupSaved}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        title="Edit Group"
        size="lg"
      >
        {editingGroup && (
          <GroupForm
            group={editingGroup}
            onSave={handleGroupSaved}
            onCancel={() => setEditingGroup(null)}
          />
        )}
      </Modal>

      {/* Application Management Modal */}
      <Modal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        title={`Manage Applications - ${selectedGroupForApps?.name}`}
        size="md"
      >
        {selectedGroupForApps && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Select or deselect applications for the "{selectedGroupForApps.name}" group
            </p>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {applications.map((application) => {
                const appName = application.name || application.title || application.app_name || `App ${application.id}`;
                
                // Enhanced assignment check - handle multiple possible data formats
                console.log('Debug application assignment:', {
                  applicationId: application.id,
                  appName: appName,
                  groupApplications: selectedGroupForApps.applications,
                  groupAppNames: selectedGroupForApps.application_names,
                  groupAppIds: selectedGroupForApps.application_ids
                });

                // Check if application is assigned using multiple methods
                const isAssigned = 
                  // Check in applications array (objects with id)
                  (selectedGroupForApps.applications || []).some(a => 
                    (typeof a === 'object' && a.id === application.id) || a === application.id
                  ) ||
                  // Check in application_ids array
                  (selectedGroupForApps.application_ids || []).includes(application.id) ||
                  // Check in application_names array
                  (selectedGroupForApps.application_names || []).includes(appName);
                
                return (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleApplicationToggle(application.id)}
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
                        <div className="font-medium text-gray-900">{appName}</div>
                        {application.description && (
                          <div className="text-sm text-gray-500">{application.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {applications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No applications available
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <button
                onClick={() => setShowApplicationModal(false)}
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