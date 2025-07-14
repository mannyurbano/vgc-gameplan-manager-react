import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthorized: boolean;
  user: GitHubUser | null;
  login: () => void;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email: string;
}

// Configuration - using server-side OAuth flow
// Option 1: Static list of authorized users (simple approach)
const AUTHORIZED_USERS = ['your-github-username']; // Replace with your GitHub username

// Option 2: Dynamic list from GitHub Gist (more flexible)
const AUTHORIZED_USERS_GIST_ID = process.env.REACT_APP_AUTHORIZED_USERS_GIST_ID || '';

// Development bypass - set to true for localhost development
const BYPASS_AUTH_IN_DEV = process.env.NODE_ENV === 'development';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions - declared first to avoid dependency issues
  const fetchAuthorizedUsers = useCallback(async (): Promise<string[]> => {
    if (!AUTHORIZED_USERS_GIST_ID) return [];

    try {
      const response = await fetch(`https://api.github.com/gists/${AUTHORIZED_USERS_GIST_ID}`);
      if (!response.ok) return [];

      const gist = await response.json();
      const content = Object.values(gist.files)[0] as any;
      
      if (content && content.content) {
        return JSON.parse(content.content);
      }
      
      return [];
    } catch {
      return [];
    }
  }, []);

  const checkServerAuth = useCallback(async () => {
    try {
      const response = await fetch('/auth/user', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Server auth check failed:', error);
      return null;
    }
  }, []);

  const checkAuthorization = useCallback(async (username: string): Promise<boolean> => {
    try {
      // Option 1: Static list (simple)
      if (AUTHORIZED_USERS.includes(username)) {
        return true;
      }

      // Option 2: Dynamic list from GitHub Gist (more flexible)
      if (AUTHORIZED_USERS_GIST_ID) {
        const authorizedUsers = await fetchAuthorizedUsers();
        return authorizedUsers.includes(username);
      }

      return false;
    } catch (error) {
      console.error('Authorization check failed:', error);
      return false;
    }
  }, [fetchAuthorizedUsers]);

  const initializeAuth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Development bypass for localhost
      if (BYPASS_AUTH_IN_DEV && window.location.hostname === 'localhost') {
        console.log('🔓 Development mode: Bypassing authentication');
        setUser({
          id: 0,
          login: 'dev-user',
          name: 'Development User',
          avatar_url: 'https://github.com/github.png',
          email: 'dev@localhost'
        });
        setIsAuthenticated(true);
        setIsAuthorized(true);
        setLoading(false);
        return;
      }

      // Check for existing server-side authentication
      const userData = await checkServerAuth();
      
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        const authorized = await checkAuthorization(userData.login);
        setIsAuthorized(authorized);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError('Authentication initialization failed');
    } finally {
      setLoading(false);
    }
  }, [checkServerAuth, checkAuthorization]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = () => {
    // Redirect to backend for OAuth
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://vgc-gameplan-manager-react-production.up.railway.app';
    window.location.href = `${backendUrl}/auth/github`;
  };

  const logout = () => {
    // Call server-side logout
    fetch('/auth/logout', {
      credentials: 'include',
    }).finally(() => {
      setIsAuthenticated(false);
      setIsAuthorized(false);
      setUser(null);
    });
  };

  const value: AuthContextType = {
    isAuthenticated,
    isAuthorized,
    user,
    login,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 