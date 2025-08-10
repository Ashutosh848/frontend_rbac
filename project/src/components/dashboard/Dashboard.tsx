import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, UserCheck, AppWindow, Activity, TrendingUp, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { fetchUsers, fetchRoles, fetchGroups, fetchApplications } from '../../services/api';

interface DashboardStats {
  users: number;
  activeUsers: number;
  roles: number;
  groups: number;
  applications: number;
  activeApplications: number;
  lastUpdated: string;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'role' | 'group' | 'application';
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  title: string;
  description: string;
  timestamp: string;
  color: string;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (autoRefresh) {
        loadDashboardData();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoRefresh]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && isOnline) {
      const interval = setInterval(() => {
        loadDashboardData(false); // Silent refresh (no loading state)
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, isOnline]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = useCallback(async (showLoading: boolean = true) => {
    if (!isOnline) return;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Fetch all data concurrently
      const [usersData, rolesData, groupsData, applicationsData] = await Promise.all([
        fetchUsers().catch(() => ({ results: [] })),
        fetchRoles().catch(() => []),
        fetchGroups().catch(() => []),
        fetchApplications().catch(() => [])
      ]);

      // Process users data
      let users = [];
      if (Array.isArray(usersData)) {
        users = usersData;
      } else if (usersData?.results && Array.isArray(usersData.results)) {
        users = usersData.results;
      }

      // Process other data
      const roles = Array.isArray(rolesData) ? rolesData : [];
      const groups = Array.isArray(groupsData) ? groupsData : [];
      
      let applications = [];
      if (Array.isArray(applicationsData)) {
        applications = applicationsData;
      } else if (applicationsData?.results && Array.isArray(applicationsData.results)) {
        applications = applicationsData.results;
      }

      // Calculate stats
      const activeUsers = users.filter((user: any) => user.status === 'active').length;
      const activeApplications = applications.filter((app: any) => app.status === 'active').length;

      const dashboardStats: DashboardStats = {
        users: users.length,
        activeUsers,
        roles: roles.length,
        groups: groups.length,
        applications: applications.length,
        activeApplications,
        lastUpdated: new Date().toISOString()
      };

      setStats(dashboardStats);
      setLastRefresh(new Date());

      // Generate mock recent activities based on actual data
      generateRecentActivities(users, roles, groups, applications);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [isOnline]);

  const generateRecentActivities = (users: any[], roles: any[], groups: any[], applications: any[]) => {
    const activities: RecentActivity[] = [];
    
    // Recent users (last 5)
    const recentUsers = users
      .filter(user => user.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    
    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user',
        action: 'created',
        title: 'New user registered',
        description: `${user.name} joined the system`,
        timestamp: user.created_at,
        color: 'blue'
      });
    });

    // Recent roles
    const recentRoles = roles
      .filter(role => role.created_at || role.createdAt)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt).getTime();
        const dateB = new Date(b.created_at || b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 2);

    recentRoles.forEach(role => {
      activities.push({
        id: `role-${role.id}`,
        type: 'role',
        action: 'created',
        title: 'New role created',
        description: `${role.name || role.title || 'Role'} was added`,
        timestamp: role.created_at || role.createdAt,
        color: 'green'
      });
    });

    // Sort activities by timestamp and take the most recent 5
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    setRecentActivities(sortedActivities);
  };

  const handleManualRefresh = () => {
    loadDashboardData(true);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const getActivityIcon = (type: string, color: string) => {
    const colorClasses = {
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      yellow: 'bg-yellow-600',
      purple: 'bg-purple-600',
      orange: 'bg-orange-600'
    };

    return (
      <div className={`w-2 h-2 rounded-full mr-3 ${colorClasses[color as keyof typeof colorClasses] || 'bg-gray-600'}`}></div>
    );
  };

  if (loading && !stats) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => loadDashboardData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    {
      title: 'Total Users',
      value: stats.users,
      subtitle: `${stats.activeUsers} active`,
      icon: Users,
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      title: 'Roles',
      value: stats.roles,
      subtitle: 'Access roles defined',
      icon: Shield,
      color: 'bg-green-500',
      trend: '+5%'
    },
    {
      title: 'Groups',
      value: stats.groups,
      subtitle: 'User groups',
      icon: UserCheck,
      color: 'bg-purple-500',
      trend: '+8%'
    },
    {
      title: 'Applications',
      value: stats.applications,
      subtitle: `${stats.activeApplications} active`,
      icon: AppWindow,
      color: 'bg-orange-500',
      trend: '+3%'
    }
  ] : [];

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-gray-600">Overview of your access control system</p>
              
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="w-4 h-4 mr-1" />
                    <span className="text-sm">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <WifiOff className="w-4 h-4 mr-1" />
                    <span className="text-sm">Offline</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Dashboard Controls */}
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-sm text-gray-500">
                Last updated: {formatTimeAgo(lastRefresh.toISOString())}
              </span>
            )}
            
            <button
              onClick={toggleAutoRefresh}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={handleManualRefresh}
              disabled={loading || !isOnline}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6 relative">
              {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}
              
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <span className="ml-2 flex items-center text-sm text-green-600">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {card.trend}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            {autoRefresh && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className={`flex items-center p-3 bg-${activity.color}-50 rounded-lg`}>
                  {getActivityIcon(activity.type, activity.color)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            {autoRefresh && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User Activity</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${stats ? Math.min(100, (stats.activeUsers / Math.max(1, stats.users)) * 100) : 0}%` }}></div>
                </div>
                <span className="text-xs text-gray-500">
                  {stats ? Math.round((stats.activeUsers / Math.max(1, stats.users)) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Application Uptime</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${stats ? Math.min(100, (stats.activeApplications / Math.max(1, stats.applications)) * 100) : 0}%` }}></div>
                </div>
                <span className="text-xs text-gray-500">
                  {stats ? Math.round((stats.activeApplications / Math.max(1, stats.applications)) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">System Status</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${isOnline ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: isOnline ? '95%' : '25%' }}></div>
                </div>
                <span className="text-xs text-gray-500">
                  {isOnline ? '95%' : '25%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};