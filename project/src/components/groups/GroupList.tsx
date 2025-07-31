import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserCheck } from 'lucide-react';
import { Group } from '../../types';
import { mockApi } from '../../services/mockApi';
import { Table } from '../common/Table';
import { SearchInput } from '../common/SearchInput';
import { GroupForm } from './GroupForm';
import { Modal } from '../common/Modal';

export const GroupList: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [groups, searchQuery]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await mockApi.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
      showNotification('error', 'Failed to load groups');
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
      await mockApi.deleteGroup(group.id);
      setGroups(groups.filter(g => g.id !== group.id));
      showNotification('success', 'Group deleted successfully');
    } catch (error) {
      console.error('Failed to delete group:', error);
      showNotification('error', 'Failed to delete group');
    }
  };

  const handleGroupSaved = () => {
    loadGroups();
    setShowCreateModal(false);
    setEditingGroup(null);
    showNotification('success', editingGroup ? 'Group updated successfully' : 'Group created successfully');
  };

  const columns = [
    {
      key: 'name',
      header: 'Group Name',
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
      header: 'Applications',
      render: (group: Group) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {group.applications.length} app{group.applications.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500">
            {group.applications.slice(0, 2).map(a => a.name).join(', ')}
            {group.applications.length > 2 && ` +${group.applications.length - 2} more`}
          </div>
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (group: Group) => (
        <div className="text-sm text-gray-600">
          {new Date(group.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
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
    </div>
  );
};