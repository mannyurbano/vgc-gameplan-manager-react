import React from 'react';
import { useAuth } from './AuthProvider';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard = ({ children, fallback }: AuthGuardProps): React.ReactElement => {
  const { isAuthenticated, isAuthorized, loading, error, user, login, logout } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  if (!isAuthenticated) {
    return <>{fallback || <LoginScreen onLogin={login} />}</>;
  }

  if (!isAuthorized) {
    return <UnauthorizedScreen user={user} onLogout={logout} />;
  }

  return <>{children}</>;
};

const LoadingScreen: React.FC = () => (
  <div className="auth-screen">
    <div className="auth-container">
      <div className="auth-logo">🎮</div>
      <h1>VGC Team Manager</h1>
      <div className="loading-spinner"></div>
      <p>Checking access...</p>

    </div>
  </div>
);

const ErrorScreen: React.FC<{ error: string }> = ({ error }) => (
  <div className="auth-screen">
    <div className="auth-container">
      <div className="auth-logo">❌</div>
      <h1>Authentication Error</h1>
      <p className="error-message">{error}</p>
      <button onClick={() => window.location.reload()} className="btn btn-primary">
        Try Again
      </button>
    </div>
  </div>
);

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => (
  <div className="auth-screen">
    <div className="auth-container">
      <div className="auth-logo">🎮</div>
      <h1>VGC Team Manager</h1>
      <p className="auth-subtitle">Professional Pokémon VGC team planning and strategy tool</p>
      <div className="auth-features">
        <div className="feature">
          <span className="feature-icon">📋</span>
          <span>Create & manage team gameplans</span>
        </div>
        <div className="feature">
          <span className="feature-icon">🎯</span>
          <span>Strategic matchup analysis</span>
        </div>
        <div className="feature">
          <span className="feature-icon">📊</span>
          <span>Export to PDF for tournaments</span>
        </div>
        <div className="feature">
          <span className="feature-icon">🔒</span>
          <span>Secure GitHub-based authentication</span>
        </div>
      </div>
      <div className="auth-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2.5rem' }}>
        <button
          onClick={onLogin}
          className="btn-login github-signin-btn"
          style={{
            background: 'linear-gradient(135deg, #24292f 0%, #4ade80 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            boxShadow: '0 4px 24px rgba(74, 222, 128, 0.15)',
            fontWeight: 700,
            fontSize: '1.15rem',
            padding: '1.2rem 2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '220px',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem' }}>
            <circle cx="12" cy="12" r="12" fill="#fff"/>
            <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.48 2.87 8.28 6.84 9.63.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" fill="#24292f"/>
          </svg>
          Sign in with GitHub
        </button>
        <span style={{
          marginTop: '1.2rem',
          color: '#4ade80',
          fontStyle: 'italic',
          fontSize: '0.98rem',
          opacity: 0.85,
          textAlign: 'center',
          maxWidth: '320px',
        }}>
          Access is currently limited to authorized beta users
        </span>
      </div>
      <div className="auth-footer">
        <p>Built for competitive VGC players</p>

      </div>
    </div>
  </div>
);

interface UnauthorizedScreenProps {
  user: any;
  onLogout: () => void;
}

const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({ user, onLogout }) => (
  <div className="auth-screen">
    <div className="auth-container">
      <div className="auth-logo">🚫</div>
      <h1>Access Not Authorized</h1>
      <p className="auth-subtitle">
        Hi <strong>{user?.name || user?.login}</strong>! 
        You're authenticated but don't have access to the VGC Team Manager beta.
      </p>
      
      <div className="auth-info">
        <div className="user-info">
          {user?.avatar_url && (
            <img src={user.avatar_url} alt="Profile" className="user-avatar" />
          )}
          <div>
            <p><strong>GitHub:</strong> @{user?.login}</p>
            <p><strong>Name:</strong> {user?.name || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="auth-message">
        <p>This tool is currently in private beta. If you'd like access:</p>
        <ul>
          <li>Contact the developer to request beta access</li>
          <li>Make sure you're on the authorized users list</li>
          <li>Check back later as we expand access</li>
        </ul>
      </div>

      <div className="auth-actions">
        <button onClick={onLogout} className="btn btn-secondary">
          <span className="btn-icon">🚪</span>
          Sign Out
        </button>
      </div>

      <div className="auth-footer">
        <p>VGC Team Manager - Professional tournament planning</p>
      </div>
    </div>
  </div>
); 