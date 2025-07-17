import React, { useState, useCallback, useRef } from 'react';

interface CloudImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  onBulkImport?: (files: FileList | File[]) => void;
}

interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
}

// Google Drive API configuration - these are safe to expose in frontend
// API Key should be restricted by domain in Google Cloud Console
const GOOGLE_DRIVE_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE', // Replace with actual API key
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE', // Replace with actual client ID
  enabled: !!(process.env.REACT_APP_GOOGLE_API_KEY && process.env.REACT_APP_GOOGLE_CLIENT_ID) // Auto-enable when credentials are provided
};

export const CloudImportModal: React.FC<CloudImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onBulkImport
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'gdrive' | 'icloud'>('local');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [gdriveFiles, setGdriveFiles] = useState<CloudFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (file.type === 'application/json' || file.name.endsWith('.json') || 
        file.type === 'text/markdown' || file.name.endsWith('.md')) {
      onImport(file);
      onClose();
    } else {
      setError('Please select a valid JSON or Markdown file');
    }
  }, [onImport, onClose]);

  // Handle multiple file selection
  const handleMultipleFileSelect = useCallback((files: FileList | File[]) => {
    if (onBulkImport) {
      onBulkImport(files);
      onClose();
    } else {
      // Fallback to single file import for each file
      Array.from(files).forEach(file => {
        if (file.type === 'application/json' || file.name.endsWith('.json') || 
            file.type === 'text/markdown' || file.name.endsWith('.md')) {
          onImport(file);
        }
      });
      onClose();
    }
  }, [onImport, onBulkImport, onClose]);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        handleFileSelect(files[0]);
      } else {
        handleMultipleFileSelect(files);
      }
    }
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  }, [handleFileSelect, handleMultipleFileSelect]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type === 'application/json' || file.name.endsWith('.json') ||
      file.type === 'text/markdown' || file.name.endsWith('.md')
    );
    
    if (validFiles.length > 0) {
      if (validFiles.length === 1) {
        handleFileSelect(validFiles[0]);
      } else {
        handleMultipleFileSelect(validFiles);
      }
    } else {
      setError('Please drop valid JSON or Markdown files');
    }
  }, [handleFileSelect, handleMultipleFileSelect]);

  // Google Drive integration
  const handleGoogleDriveAuthInternal = useCallback(async () => {
    try {
      const googleAPI = (window as any).GoogleDriveAPI;
      
      if (!GOOGLE_DRIVE_CONFIG.enabled) {
        throw new Error('Google Drive integration is not configured. Please contact the administrator.');
      }

      if (!GOOGLE_DRIVE_CONFIG.apiKey || !GOOGLE_DRIVE_CONFIG.clientId) {
        throw new Error('Google API credentials not configured. Please contact the administrator.');
      }

      const gapi = await googleAPI.init(GOOGLE_DRIVE_CONFIG.apiKey, GOOGLE_DRIVE_CONFIG.clientId);
      const authInstance = gapi.auth2.getAuthInstance();
      
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }

      // Fetch files from Google Drive
      const response = await gapi.client.drive.files.list({
        pageSize: 20,
        fields: 'files(id, name, mimeType, size, modifiedTime)',
        q: "mimeType='application/json' and trashed=false"
      });

      setGdriveFiles(response.result.files || []);
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGoogleDriveAuth = useCallback(async () => {
    if (!GOOGLE_DRIVE_CONFIG.enabled) {
      setError('Google Drive integration is not configured. Please use local file import instead.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Load Google API if not already loaded
      const googleAPI = (window as any).GoogleDriveAPI;
      if (!googleAPI) {
        // Load the Google API loader script
        const script = document.createElement('script');
        script.src = '/google-api-loader.js';
        script.onload = async () => {
          try {
            await handleGoogleDriveAuthInternal();
          } catch (err) {
            setError(`Google Drive error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsLoading(false);
          }
        };
        script.onerror = () => {
          setError('Failed to load Google API. Please check your internet connection.');
          setIsLoading(false);
        };
        document.head.appendChild(script);
        return;
      }

      await handleGoogleDriveAuthInternal();
    } catch (err) {
      setError(`Google Drive error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [handleGoogleDriveAuthInternal]);

  const handleGoogleDriveImport = useCallback(async (file: CloudFile) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const googleAPI = (window as any).GoogleDriveAPI;
      if (!googleAPI) {
        throw new Error('Google API not loaded');
      }

      const gapi = await googleAPI.load();
      const response = await gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      // Convert the response to a File object
      const blob = new Blob([JSON.stringify(response.result)], { type: 'application/json' });
      const fileObj = new File([blob], file.name, { type: 'application/json' });
      
      onImport(fileObj);
      onClose();
    } catch (err) {
      setError(`Failed to import file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [onImport, onClose]);

  // iCloud integration (using native file picker)
  const handleICloudAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For iCloud, we'll use a simple file picker approach
      // In a real implementation, you'd need to integrate with iCloud WebDAV API
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.md';
      input.multiple = false;
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          onImport(file);
          onClose();
        }
      };
      
      input.click();
    } catch (err) {
      setError(`iCloud error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [onImport, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal cloud-import-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import Gameplans</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            📁 Local File
          </button>
          <button 
            className={`tab ${activeTab === 'gdrive' ? 'active' : ''} ${!GOOGLE_DRIVE_CONFIG.enabled ? 'disabled' : ''}`}
            onClick={() => setActiveTab('gdrive')}
            disabled={!GOOGLE_DRIVE_CONFIG.enabled}
          >
            ☁️ Google Drive
          </button>
          <button 
            className={`tab ${activeTab === 'icloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('icloud')}
          >
            🍎 iCloud
          </button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {activeTab === 'local' && (
            <div className="tab-content">
              <div 
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.md"
                  multiple
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
                <div className="dropzone-content">
                  <div className="dropzone-icon">📁</div>
                  {isDragActive ? (
                    <p>Drop the file here...</p>
                  ) : (
                    <>
                      <p>Drag & drop files here, or click to select</p>
                      <p className="dropzone-hint">Supports JSON exports and Markdown gameplan files (multiple files supported)</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gdrive' && (
            <div className="tab-content">
              {!GOOGLE_DRIVE_CONFIG.enabled ? (
                <div className="cloud-auth">
                  <div className="cloud-icon">☁️</div>
                  <h4>Google Drive Not Configured</h4>
                  <p>Google Drive integration is not currently configured.</p>
                  <p>Please use local file import instead.</p>
                </div>
              ) : gdriveFiles.length === 0 ? (
                <div className="cloud-auth">
                  <div className="cloud-icon">☁️</div>
                  <h4>Connect to Google Drive</h4>
                  <p>Access your gameplan files stored in Google Drive</p>
                  <button 
                    onClick={handleGoogleDriveAuth}
                    disabled={isLoading}
                    className="btn btn-primary"
                  >
                    {isLoading ? 'Connecting...' : 'Connect to Google Drive'}
                  </button>
                </div>
              ) : (
                <div className="cloud-files">
                  <h4>Your Google Drive Files</h4>
                  <div className="file-list">
                    {gdriveFiles.map(file => (
                      <div key={file.id} className="file-item">
                        <div className="file-info">
                          <div className="file-name">{file.name}</div>
                          <div className="file-meta">
                            {file.size && `${(file.size / 1024).toFixed(1)} KB`}
                            {file.modifiedTime && ` • Modified ${new Date(file.modifiedTime).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleGoogleDriveImport(file)}
                          disabled={isLoading}
                          className="btn btn-sm btn-primary"
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'icloud' && (
            <div className="tab-content">
              <div className="cloud-auth">
                <div className="cloud-icon">🍎</div>
                <h4>Import from iCloud</h4>
                <p>Select a gameplan file from your iCloud Drive</p>
                <button 
                  onClick={handleICloudAuth}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'Opening...' : 'Select from iCloud'}
                </button>
                <p className="cloud-note">
                  Note: This will open your system's file picker to access iCloud Drive
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}; 