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

// Configuration - add these to your .env file
const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID || 'your_github_client_id';
const GITHUB_CLIENT_SECRET = process.env.REACT_APP_GITHUB_CLIENT_SECRET || 'your_github_client_secret';
// const GITHUB_REDIRECT_URI = process.env.REACT_APP_GITHUB_REDIRECT_URI || 
//   `${window.location.origin}/auth/callback`;

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

  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const exchangeCodeForToken = useCallback(async (code: string) => {
    try {
      // Using a Vercel function for the OAuth proxy
      const response = await fetch('/api/github-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code: code,
        }),
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
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

  const handleOAuthCallback = useCallback(async (code: string, state: string) => {
    const storedState = localStorage.getItem('oauth_state');
    
    if (state !== storedState) {
      throw new Error('Invalid OAuth state');
    }

    localStorage.removeItem('oauth_state');

    try {
      // Exchange code for token using GitHub's device flow or a proxy service
      const tokenResponse = await exchangeCodeForToken(code);
      const accessToken = tokenResponse.access_token;

      // Get user information
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information');
      }

      const userData: GitHubUser = await userResponse.json();

      // Store authentication data
      localStorage.setItem('github_access_token', accessToken);
      localStorage.setItem('github_user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      // Check authorization
      const authorized = await checkAuthorization(userData.login);
      setIsAuthorized(authorized);

    } catch (error) {
      console.error('OAuth callback error:', error);
      setError('Authentication failed');
    }
  }, [exchangeCodeForToken, checkAuthorization]);

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

      // Check if we're returning from GitHub OAuth
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && state) {
        // Handle OAuth callback
        await handleOAuthCallback(code, state);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Check for existing authentication
      const storedToken = localStorage.getItem('github_access_token');
      const storedUser = localStorage.getItem('github_user');

      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          const isValid = await validateToken(storedToken);
          
          if (isValid) {
            setUser(userData);
            setIsAuthenticated(true);
            const authorized = await checkAuthorization(userData.login);
            setIsAuthorized(authorized);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('github_access_token');
            localStorage.removeItem('github_user');
          }
        } catch (error) {
          console.error('Error validating stored auth:', error);
          localStorage.removeItem('github_access_token');
          localStorage.removeItem('github_user');
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError('Authentication initialization failed');
    } finally {
      setLoading(false);
    }
  }, [handleOAuthCallback, checkAuthorization, validateToken]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = () => {
    // Redirect to backend for OAuth
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://vgc-gameplan-manager-react-production.up.railway.app';
    window.location.href = `${backendUrl}/auth/github`;
  };

  const logout = () => {
    localStorage.removeItem('github_access_token');
    localStorage.removeItem('github_user');
    localStorage.removeItem('oauth_state');
    setIsAuthenticated(false);
    setIsAuthorized(false);
    setUser(null);
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