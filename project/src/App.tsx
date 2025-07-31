import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { UserList } from './components/users/UserList';
import { RoleList } from './components/roles/RoleList';
import { GroupList } from './components/groups/GroupList';
import { ApplicationList } from './components/applications/ApplicationList';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <UserList />;
      case 'roles':
        return <RoleList />;
      case 'groups':
        return <GroupList />;
      case 'applications':
        return <ApplicationList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 lg:ml-0">
        <main className="pt-16 lg:pt-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;