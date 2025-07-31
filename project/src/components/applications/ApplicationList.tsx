import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AppWindow, ExternalLink } from 'lucide-react';
import { Application } from '../../types';
import { mockApi } from '../../services/mockApi';
import { Table } from '../common/Table';
import { StatusBadge } from '../common/StatusBadge';
import { SearchInput } from '../common/SearchInput';
import { ApplicationForm } from './ApplicationForm';
import { Modal } from '../common/Modal';

export const ApplicationList: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    const filtered = applications.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredApplications(filtered);
  }, [applications, searchQuery]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await mockApi.getApplications();
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
      showNotification('error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteApplication = async (application: Application) => {
    if (!window.confirm(`Are you sure you want to delete the application "${application.name}"?`)) return;
    
    try {
      await mockApi.deleteApplication(application.id);
      setApplications(applications.filter(a => a.id !== application.id));
      showNotification('success', 'Application deleted successfully');
    } catch (error) {
      console.error('Failed to delete application:', error);
      showNotification('error', 'Failed to delete application');
    }
  };

  const handleApplicationSaved = () => {
    loadApplications();
    setShowCreateModal(false);
    setEditingApplication(null);
    showNotification('success', editingApplication ? 'Application updated successfully' : 'Application created successfully');
  };

  const columns = [
    {
      key: 'name',
      header: 'Application',
      render: (app: Application) => (
        <div className="flex items-center">
          <div className="p-2 bg-orange-100 rounded-lg mr-3">
            <AppWindow className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{app.name}</div>
            <div className="text-sm text-gray-500">{app.description}</div>
            {app.url && (
              <div className="flex items-center mt-1">
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  {app.url}
                  <ExternalLink className="w-3 h-3 ml-1" />
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
      key: 'groups',
      header: 'Groups',
      render: (app: Application) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {app.groups.length} group{app.groups.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500">
            {app.groups.slice(0, 2).map(g => g.name).join(', ')}
            {app.groups.length > 2 && ` +${app.groups.length - 2} more`}
          </div>
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (app: Application) => (
        <div className="text-sm text-gray-600">
          {new Date(app.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (app: Application) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditingApplication(app)}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteApplication(app)}
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
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600 mt-1">Manage applications and their access controls</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Application
          </button>
        </div>

        <div className="mt-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search applications by name or description..."
            className="max-w-md"
          />
        </div>
      </div>

      <Table
        data={filteredApplications}
        columns={columns}
        loading={loading}
        emptyMessage="No applications found"
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