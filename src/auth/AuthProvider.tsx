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

      // Device Flow doesn't use callback URLs, so just check for existing auth
      const storedToken = localStorage.getItem('github_auth_token');
      const storedUser = localStorage.getItem('github_user');
      
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
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
  }, [fetchUserProfile, checkAuthorization]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use GitHub Device Flow for client-side authentication
      console.log('🔄 Starting GitHub Device Flow...');
      
      // Step 1: Request device and user codes
      const deviceResponse = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          scope: 'user:email',
        }),
      });
      
      if (!deviceResponse.ok) {
        throw new Error('Failed to initiate device flow');
      }
      
      const deviceData = await deviceResponse.json();
      
      // Step 2: Show user the verification URL and code
      const userCode = deviceData.user_code;
      const verificationUri = deviceData.verification_uri;
      const deviceCode = deviceData.device_code;
      const interval = deviceData.interval || 5;
      
      // Open GitHub device verification in new tab
      window.open(verificationUri, '_blank');
      
      // Show user code to user
      const copyCode = () => {
        navigator.clipboard.writeText(userCode);
        alert('Code copied to clipboard!');
      };
      
      const userConfirmed = window.confirm(
        `Please go to ${verificationUri} and enter this code:\n\n${userCode}\n\nClick OK after you've authorized the app.\n\n(The verification page has been opened in a new tab)`
      );
      
      if (!userConfirmed) {
        setLoading(false);
        return;
      }
      
      // Step 3: Poll for access token
      console.log('🔄 Polling for access token...');
      
      const pollForToken = async () => {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
          // Success! We have an access token
          console.log('✅ Access token received!');
          
          // Fetch user profile
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
          
          setLoading(false);
          return true;
        } else if (tokenData.error === 'authorization_pending') {
          // Still waiting for user authorization
          return false;
        } else if (tokenData.error === 'slow_down') {
          // Rate limited, wait longer
          return false;
        } else {
          // Other error
          throw new Error(`Device flow error: ${tokenData.error}`);
        }
      };
      
      // Poll every few seconds
      const maxAttempts = 20; // 20 attempts = ~2 minutes
      let attempts = 0;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const success = await pollForToken();
          if (success) {
            clearInterval(pollInterval);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setError('Device authorization timed out. Please try again.');
            setLoading(false);
          }
        } catch (error) {
          clearInterval(pollInterval);
          console.error('Token polling error:', error);
          setError('Failed to complete device authorization');
          setLoading(false);
        }
      }, interval * 1000);
      
    } catch (error) {
      console.error('Device flow error:', error);
      setError('Failed to start device authorization flow');
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