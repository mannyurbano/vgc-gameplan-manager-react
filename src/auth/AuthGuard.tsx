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
      {process.env.NODE_ENV === 'development' && (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
          💡 Development mode: Auth bypass enabled for localhost
        </p>
      )}
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

      <div className="auth-actions">
        <button onClick={onLogin} className="btn btn-primary btn-large">
          <span className="btn-icon">🔐</span>
          Sign in with GitHub
        </button>
        <p className="auth-notice">
          Access is currently limited to authorized beta users
        </p>
      </div>

      <div className="auth-footer">
        <p>Built for competitive VGC players</p>
        {process.env.NODE_ENV === 'development' && (
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            🔓 Running in development mode - auth bypass enabled
          </p>
        )}
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