import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, AppWindow, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Application } from '../../types';
import { fetchApplications, deleteApplication, isAuthenticated } from '../../services/api';
import { Table } from '../common/Table';
import { StatusBadge } from '../common/StatusBadge';
import { SearchInput } from '../common/SearchInput';
import { ApplicationForm } from './ApplicationForm';
import { Modal } from '../common/Modal';

interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  id: string;
}

export const ApplicationList: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      setError('You are not authenticated. Please log in to view applications.');
      setLoading(false);
      return;
    }
    loadApplications();
  }, []);

  // Filter applications based on search query
  useEffect(() => {
    const filtered = applications.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.url && app.url.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredApplications(filtered);
  }, [applications, searchQuery]);

  const loadApplications = useCallback(async (isRefresh = false) => {
    try {
      if (!isAuthenticated()) {
        setError('Authentication required. Please log in again.');
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      const data = await fetchApplications();
      console.log('Received applications data:', data);
      
      // Ensure we have an array of applications
      const applicationsArray = Array.isArray(data) ? data : [];
      console.log('Setting applications:', applicationsArray);
      
      setApplications(applicationsArray);
      
      if (isRefresh) {
        showNotification('success', `Applications refreshed successfully (${applicationsArray.length} found)`);
      }
    } catch (error: any) {
      console.error('Failed to load applications:', error);
      
      let errorMessage = 'Failed to load applications. Please try again.';
      if (error.message?.includes('authentication')) {
        errorMessage = 'Your session has expired. Please log in again.';
        setError(errorMessage);
      } else if (error.message?.includes('Server error')) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view applications.';
        setError(errorMessage);
      }
      
      showNotification('error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const showNotification = (type: NotificationState['type'], message: string) => {
    const id = Date.now().toString();
    const notification: NotificationState = { type, message, id };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteApplication = async (application: Application) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the application "${application.name}"?\n\nThis action cannot be undone and will remove all associated access permissions.`
    );
    
    if (!confirmed) return;
    
    try {
      if (!isAuthenticated()) {
        showNotification('error', 'Your session has expired. Please log in again.');
        return;
      }

      setDeletingId(application.id);
      await deleteApplication(application.id);
      
      // Remove from local state immediately for better UX
      setApplications(prev => prev.filter(app => app.id !== application.id));
      showNotification('success', `Application "${application.name}" deleted successfully`);
    } catch (error: any) {
      console.error('Failed to delete application:', error);
      
      let errorMessage = 'Failed to delete application. Please try again.';
      if (error.message?.includes('authentication')) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this application.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Cannot delete application. It may have active dependencies.';
      }
      
      showNotification('error', errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const handleApplicationSaved = () => {
    // Reload applications to get the latest data
    loadApplications();
    setShowCreateModal(false);
    setEditingApplication(null);
    
    const message = editingApplication 
      ? 'Application updated successfully' 
      : 'Application created successfully';
    showNotification('success', message);
  };

  const handleRefresh = () => {
    loadApplications(true);
  };

  const columns = [
    {
      key: 'name',
      header: 'Application',
      render: (app: Application) => (
        <div className="flex items-center">
          <div className="p-2 bg-orange-100 rounded-lg mr-3 flex-shrink-0">
            <AppWindow className="w-4 h-4 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">{app.name}</div>
            <div className="text-sm text-gray-500 line-clamp-2">{app.description}</div>
            {app.url && (
              <div className="flex items-center mt-1">
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center truncate max-w-xs"
                  title={app.url}
                >
                  <span className="truncate">{app.url}</span>
                  <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (app: Application) => <StatusBadge status={app.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (app: Application) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingApplication(app)}
            className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded"
            title="Edit application"
            disabled={deletingId === app.id}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteApplication(app)}
            className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded disabled:opacity-50"
            title="Delete application"
            disabled={deletingId === app.id}
          >
            {deletingId === app.id ? (
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      )
    }
  ];

  // If there's an authentication error, show error state
  if (error && error.includes('Authentication') || error && error.includes('permission')) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-16 text-center">
          <div className="p-4 bg-red-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-md shadow-lg border max-w-sm ${
              {
                success: 'bg-green-50 text-green-800 border-green-200',
                error: 'bg-red-50 text-red-800 border-red-200',
                warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                info: 'bg-blue-50 text-blue-800 border-blue-200'
              }[notification.type]
            }`}
          >
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium flex-1">{notification.message}</p>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600 mt-1">
              Manage applications and their access controls
              {applications.length > 0 && (
                <span className="ml-2 text-sm">({applications.length} total)</span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="Refresh applications"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Application
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search applications by name, description, or URL..."
            className="max-w-md"
          />
          {searchQuery && (
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredApplications.length} of {applications.length} applications
            </div>
          )}
        </div>
      </div>

      <Table
        data={filteredApplications}
        columns={columns}
        loading={loading}
        emptyMessage={
          searchQuery 
            ? `No applications found matching "${searchQuery}"`
            : "No applications found. Create your first application to get started."
        }
      />

      {/* Create Application Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Application"
        size="lg"
      >
        <ApplicationForm
          onSave={handleApplicationSaved}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Application Modal */}
      <Modal
        isOpen={!!editingApplication}
        onClose={() => setEditingApplication(null)}
        title="Edit Application"
        size="lg"
      >
        {editingApplication && (
          <ApplicationForm
            application={editingApplication}
            onSave={handleApplicationSaved}
            onCancel={() => setEditingApplication(null)}
          />
        )}
      </Modal>
    </div>
  );
};