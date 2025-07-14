# Cloud Import Feature Setup Guide

The VGC Gameplan Manager now supports importing gameplan files from Google Drive and iCloud. This guide will help you set up the necessary configurations.

## Features

- **Local File Import**: Drag & drop or click to select JSON files from your computer
- **Google Drive Import**: Connect to your Google Drive and browse/import gameplan files
- **iCloud Import**: Access files from your iCloud Drive through the system file picker

## Setup Instructions

### Google Drive Integration

To enable Google Drive import functionality, you'll need to set up Google Cloud Console credentials:

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Drive API

2. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add your domain to authorized origins (e.g., `https://yourdomain.com`)
   - Add your redirect URI (e.g., `https://yourdomain.com`)

3. **Get API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Restrict the API key to Google Drive API only

4. **Environment Variables**:
   Create a `.env` file in your project root with:
   ```
   REACT_APP_GOOGLE_API_KEY=your_api_key_here
   REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
   ```

### iCloud Integration

iCloud integration uses the native file picker, so no additional setup is required. Users can access their iCloud Drive files through the system's file selection dialog.

## Usage

### Local File Import
1. Click the "📤 Import" button
2. Select the "📁 Local File" tab
3. Drag & drop a JSON file or click to browse
4. The file will be automatically imported if it's a valid VGC gameplan export

### Google Drive Import
1. Click the "📤 Import" button
2. Select the "☁️ Google Drive" tab
3. Click "Connect to Google Drive"
4. Sign in with your Google account
5. Browse and select a gameplan file from your Drive
6. Click "Import" to download and import the file

### iCloud Import
1. Click the "📤 Import" button
2. Select the "🍎 iCloud" tab
3. Click "Select from iCloud"
4. Navigate to your iCloud Drive folder
5. Select a JSON gameplan file
6. The file will be automatically imported

## File Format

The import feature supports JSON files exported from the VGC Gameplan Manager. The file should contain an array of gameplan objects with the following structure:

```json
[
  {
    "id": "unique_id",
    "title": "Gameplan Title",
    "content": "Gameplan content in markdown...",
    "dateCreated": "2024-01-01",
    "tags": ["tag1", "tag2"],
    "season": "2024",
    "tournament": "Regional",
    "format": "VGC"
  }
]
```

## Security Notes

- Google Drive integration only requests read-only access to your Drive
- No files are uploaded to external servers
- All file processing happens locally in your browser
- OAuth tokens are stored securely in browser localStorage

## Troubleshooting

### Google Drive Issues
- **"Google API not loaded"**: Check your internet connection
- **"Credentials not configured"**: Verify your environment variables are set correctly
- **"Access denied"**: Make sure you've authorized the application in Google Cloud Console

### iCloud Issues
- **File picker not opening**: Ensure iCloud Drive is enabled on your device
- **Files not showing**: Check that your files are synced to iCloud Drive

### General Issues
- **Invalid file format**: Ensure you're importing a valid JSON file exported from VGC Gameplan Manager
- **Import fails**: Check the browser console for detailed error messages

## Development Notes

For developers working on this feature:

- The Google API loader is in `public/google-api-loader.js`
- Cloud import modal component is in `src/CloudImportModal.tsx`
- CSS styles are in `src/App.css` under the "Cloud Import Modal Styles" section
- The feature integrates with the existing `processImportFile` function in `App.tsx`

## Future Enhancements

Potential improvements for the cloud import feature:
- Support for other cloud storage providers (Dropbox, OneDrive)
- Direct export to cloud storage
- Automatic sync between devices
- Batch import functionality
- File format validation and conversion 