// Google API Loader for VGC Gameplan Manager
// This script loads the Google API client library for Drive integration

(function() {
  'use strict';

  // Load Google API client library
  function loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.gapi) {
        resolve(window.gapi);
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        if (window.gapi) {
          resolve(window.gapi);
        } else {
          reject(new Error('Google API failed to load'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google API script'));
      };

      // Add to document
      document.head.appendChild(script);
    });
  }

  // Initialize Google Drive API
  async function initGoogleDriveAPI(apiKey, clientId) {
    try {
      const gapi = await loadGoogleAPI();
      
      return new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
          try {
            await gapi.client.init({
              apiKey: apiKey,
              clientId: clientId,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
              scope: 'https://www.googleapis.com/auth/drive.readonly'
            });
            
            resolve(gapi);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // Expose functions globally
  window.GoogleDriveAPI = {
    load: loadGoogleAPI,
    init: initGoogleDriveAPI
  };

  console.log('Google API Loader initialized');
})(); 