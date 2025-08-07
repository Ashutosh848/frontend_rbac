import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import LoginPage from './components/loginpage/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { UserList } from './components/users/UserList';
import { RoleList } from './components/roles/RoleList';
import { GroupList } from './components/groups/GroupList';
import { ApplicationList } from './components/applications/ApplicationList';
import axios from 'axios';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, isAuthenticated }) => {
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Main App Layout Component
interface AppLayoutProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ isAuthenticated, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const location = useLocation();
  
  // Extract current tab from pathname
  const getCurrentTab = (): string => {
    const path = location.pathname.substring(1); // Remove leading slash
    return path || 'dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        activeTab={getCurrentTab()} 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={onLogout}
      />
      
      <div className="flex-1 lg:ml-0">
        <main className="pt-16 lg:pt-0">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/roles" element={<RoleList />} />
            <Route path="/groups" element={<GroupList />} />
            <Route path="/applications" element={<ApplicationList />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  console.log('🚀 App component rendered - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('🔍 Starting auth check...');
      
      try {
        // Check if URL has logout parameter
        const urlParams = new URLSearchParams(window.location.search);
        const forceLogout = urlParams.get('logout') === 'true';
        
        if (forceLogout) {
          console.log('🚪 Force logout detected');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          delete axios.defaults.headers.common['Authorization'];
          // Remove the parameter from URL
          window.history.replaceState({}, '', window.location.pathname);
          setIsAuthenticated(false);
          setIsLoading(false);
          setAuthChecked(true);
          return;
        }
        
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        console.log('🔑 Tokens found:', { 
          hasAccessToken: !!token, 
          hasRefreshToken: !!refreshToken,
          accessTokenPreview: token ? token.substring(0, 20) + '...' : 'none',
          refreshTokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : 'none'
        });
        
        if (!token || !refreshToken) {
          // No tokens, user is not authenticated
          console.log('❌ No tokens found, setting as unauthenticated');
          setIsAuthenticated(false);
          setIsLoading(false);
          setAuthChecked(true);
          return;
        }

        // Set the token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // If both tokens exist, assume user is authenticated
        // The axios interceptor will handle token refresh if needed
        console.log('✅ Tokens found, setting as authenticated');
        setIsAuthenticated(true);
        
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        // On any error, clear tokens and set as unauthenticated
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete axios.defaults.headers.common['Authorization'];
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
        console.log('🏁 Auth check completed');
      }
    };

    // Only run auth check once
    if (!authChecked) {
      checkAuthStatus();
    }
  }, [authChecked]);

  const handleLogin = (): void => {
    setIsAuthenticated(true);
  };

  const handleLogout = (): void => {
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <LoginPage onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/*" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AppLayout 
                isAuthenticated={isAuthenticated} 
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;