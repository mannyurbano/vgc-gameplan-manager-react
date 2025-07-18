# Security Policy

## Overview

The VGC Team Manager takes security seriously. This document outlines our security practices and how to report security vulnerabilities.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Features

### Authentication
- GitHub OAuth integration with secure token handling
- User authorization based on allowlist
- Development bypass mode for localhost testing only
- Secure session management

### Data Protection
- All game data stored locally (localStorage/API)
- No sensitive user data persistence beyond GitHub profile
- Environment variable protection for API keys
- Proper secret management practices

### Code Security
- TypeScript for type safety
- Comprehensive linting rules
- Input validation and sanitization
- XSS protection measures

## Environment Variables

The following environment variables should be configured securely:

### Required for Production
```bash
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id
REACT_APP_GITHUB_REDIRECT_URI=your_redirect_uri
```

### Optional
```bash
REACT_APP_RAILWAY_BACKEND_URL=your_backend_url
REACT_APP_GOOGLE_API_KEY=your_google_api_key
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_AUTHORIZED_USERS_GIST_ID=your_gist_id
REACT_APP_DEBUG=false
```

### Security Best Practices

1. **Never commit secrets to version control**
2. **Use environment variables for all API keys**
3. **Restrict GitHub OAuth app scope to minimum required**
4. **Regularly rotate API keys and tokens**
5. **Keep dependencies updated**

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email the maintainer directly (check GitHub profile)
3. Include detailed steps to reproduce
4. Allow reasonable time for response and fix

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if available)

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 1 week
- **Fix Timeline**: Depends on severity
  - Critical: Within 1 week
  - High: Within 2 weeks
  - Medium: Within 1 month
  - Low: Next release cycle

## Security Updates

Security updates will be:
- Released as patch versions
- Documented in the changelog
- Announced in release notes

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help improve our security.

Thank you for helping keep VGC Team Manager secure!