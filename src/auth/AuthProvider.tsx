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

// Configuration - Client-side OAuth flow
// Replace this with your actual GitHub OAuth Client ID
const GITHUB_CLIENT_ID = 'Ov23liIpfWCMoPUySiiP'; // Your GitHub OAuth Client ID

// Option 1: Static list of authorized users (simple approach)
const AUTHORIZED_USERS = ['mannyurbano']; // Replace with your actual GitHub username

// Option 2: Dynamic list from GitHub Gist (more flexible)
const AUTHORIZED_USERS_GIST_ID = ''; // Add your Gist ID here if using dynamic list

// Development bypass - set to true for localhost development
const BYPASS_AUTH_IN_DEV = process.env.NODE_ENV === 'development';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
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

  const fetchUserProfile = useCallback(async (token: string): Promise<GitHubUser | null> => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const userData = await response.json();

      // Get user email
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      const emails = await emailResponse.json();
      const primaryEmail = emails.find((email: any) => email.primary)?.email || '';

      return {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
        email: primaryEmail,
      };
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }, []);

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

      // Check for OAuth callback (both implicit and authorization code flows)
      
      // Check URL search params for authorization code flow
      const urlSearchParams = new URLSearchParams(window.location.search);
      const authCode = urlSearchParams.get('code');
      const receivedState = urlSearchParams.get('state');
      const error = urlSearchParams.get('error');
      
      // Check URL hash for implicit flow
      const urlHashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = urlHashParams.get('access_token');
      const hashError = urlHashParams.get('error');
      const hashState = urlHashParams.get('state');
      
      if (error || hashError) {
        setError(`OAuth error: ${error || hashError}`);
        setLoading(false);
        return;
      }
      
      // Validate state parameter for CSRF protection
      const storedState = localStorage.getItem('github_oauth_state');
      const stateToValidate = receivedState || hashState;
      
      if ((authCode || accessToken) && stateToValidate && stateToValidate !== storedState) {
        setError('Invalid state parameter - possible CSRF attack');
        setLoading(false);
        return;
      }
      
      if (authCode) {
        console.log('🔄 Authorization code received, but client-side apps cannot exchange codes securely');
        // Clear the URL search params
        window.history.replaceState({}, document.title, window.location.pathname);
        setError('OAuth configuration issue: Received authorization code instead of access token. Please update your GitHub OAuth app to support implicit flow or use a server-side proxy.');
      } else if (accessToken) {
        console.log('🔄 Access token received from implicit flow...');
        // Clear the URL hash
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Fetch user profile
        const userData = await fetchUserProfile(accessToken);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          const authorized = await checkAuthorization(userData.login);
          setIsAuthorized(authorized);
          
          // Store auth state
          localStorage.setItem('github_auth_token', accessToken);
          localStorage.setItem('github_user', JSON.stringify(userData));
        }
      } else {
        // Check for existing auth
        const storedToken = localStorage.getItem('github_auth_token');
        const storedUser = localStorage.getItem('github_user');
        
        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          const authorized = await checkAuthorization(userData.login);
          setIsAuthorized(authorized);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError('Authentication initialization failed');
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, checkAuthorization]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = () => {
    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('github_oauth_state', state);
    
    // Build OAuth URL for implicit flow - DO NOT encode the client_id as it's already clean
    // Handle both GitHub Pages and Railway deployments
    let baseUrl;
    if (window.location.hostname === 'mannyurbano.github.io') {
      // GitHub Pages: use full path without trailing slash
      baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
    } else {
      // Railway or other deployments: use just origin
      baseUrl = window.location.origin;
    }
    const redirectUri = encodeURIComponent(baseUrl);
    const scope = encodeURIComponent('user:email');
    
    // Use implicit flow (response_type=token) for client-side OAuth
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=token`;
    
    console.log('OAuth URL:', oauthUrl); // Debug log
    
    // Redirect to GitHub OAuth
    window.location.href = oauthUrl;
  };

  const logout = () => {
    // Clear stored auth data
    localStorage.removeItem('github_auth_token');
    localStorage.removeItem('github_user');
    localStorage.removeItem('github_oauth_state');
    
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