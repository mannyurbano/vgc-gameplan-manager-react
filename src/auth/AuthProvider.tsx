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

      // Check for OAuth callback (PKCE authorization code flow)
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      const receivedState = urlParams.get('state');
      const error = urlParams.get('error');
      
      if (error) {
        setError(`OAuth error: ${error}`);
        setLoading(false);
        return;
      }
      
      if (authCode) {
        console.log('🔄 Authorization code received, exchanging for access token...');
        // Clear the URL search params
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          // Validate state parameter
          const storedState = localStorage.getItem('oauth_state');
          if (receivedState !== storedState) {
            throw new Error('Invalid state parameter - possible CSRF attack');
          }
          
          // Get the redirect URI that was used
          let redirectUri;
          if (window.location.hostname === 'mannyurbano.github.io') {
            redirectUri = window.location.origin + window.location.pathname.replace(/\/$/, '');
          } else {
            redirectUri = window.location.origin;
          }
          
          // Exchange authorization code for access token using Railway OAuth proxy
          const proxyUrl = 'https://vgc-gameplan-manager-react-production.up.railway.app/oauth/github/token';
          const tokenResponse = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: GITHUB_CLIENT_ID,
              code: authCode,
              redirect_uri: redirectUri,
            }),
          });
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.access_token) {
            console.log('✅ Access token received!');
            
            // Clean up stored OAuth parameters
            localStorage.removeItem('oauth_state');
            
            // Fetch user profile with the access token
            const userData = await fetchUserProfile(tokenData.access_token);
            if (userData) {
              setUser(userData);
              setIsAuthenticated(true);
              const authorized = await checkAuthorization(userData.login);
              setIsAuthorized(authorized);
              
              // Store auth state
              localStorage.setItem('github_auth_token', tokenData.access_token);
              localStorage.setItem('github_user', JSON.stringify(userData));
            }
          } else {
            throw new Error(`Token exchange failed: ${tokenData.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('OAuth token exchange error:', error);
          setError('Failed to complete authentication');
          // Clean up stored OAuth parameters on error
          localStorage.removeItem('oauth_state');
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
  }, [checkAuthorization, fetchUserProfile]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = () => {
    console.log('🚀 Login button clicked - starting OAuth Flow...');
    setLoading(true);
    setError(null);
    
    try {
      // Generate state parameter for CSRF protection
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('oauth_state', state);
      
      // Build OAuth URL for server-side flow
      let baseUrl;
      if (window.location.hostname === 'mannyurbano.github.io') {
        baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
      } else {
        baseUrl = window.location.origin;
      }
      
      const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: baseUrl,
        scope: 'user:email',
        state: state,
        response_type: 'code'
      });
      
      const oauthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      
      console.log('🔄 Redirecting to GitHub OAuth...');
      console.log('OAuth URL:', oauthUrl);
      
      // Redirect to GitHub OAuth
      window.location.href = oauthUrl;
      
    } catch (error) {
      console.error('OAuth error:', error);
      setError('Failed to start OAuth authorization');
      setLoading(false);
    }
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