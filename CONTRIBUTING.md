# Contributing to VGC Team Manager

Thank you for your interest in contributing to VGC Team Manager! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/vgc-gameplan-manager-react.git
   cd vgc-gameplan-manager-react
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Server**
   ```bash
   npm start
   ```

## 🔧 Development Workflow

### Code Quality Standards

We maintain high code quality through:

- **TypeScript**: All new code should be written in TypeScript
- **ESLint**: Run `npm run lint` to check for issues
- **Prettier**: Run `npm run format` to format code
- **Type Checking**: Run `npm run type-check` to verify types

### Before Submitting

Run the validation command to ensure your changes meet our standards:
```bash
npm run validate
```

This runs:
- TypeScript type checking
- ESLint with zero warnings
- Prettier formatting check
- Unit tests

## 📝 Pull Request Process

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
# or  
git checkout -b docs/documentation-update
```

### 2. Branch Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `security/` - Security improvements
- `enhancement/` - Improvements to existing features
- `docs/` - Documentation updates
- `cleanup/` - Code cleanup and refactoring

### 3. Commit Message Guidelines

Use descriptive commit messages with emojis:

```
🔒 Security: Fix exposed API keys
✨ Feature: Add Pokemon team import functionality
🐛 Fix: Resolve authentication timeout issue
📚 Docs: Update deployment instructions
🧹 Cleanup: Remove unused console.log statements
⚡ Enhancement: Improve TypeScript configuration
```

### 4. Pull Request Template

When creating a PR, include:

- **Description**: What changes were made and why
- **Type**: Feature/Fix/Enhancement/Docs/Security
- **Testing**: How the changes were tested
- **Screenshots**: For UI changes
- **Breaking Changes**: If applicable

## 🧪 Testing

### Running Tests
```bash
npm test                    # Run tests in watch mode
npm test -- --coverage     # Run with coverage report
npm test -- --watchAll=false # Run once
```

### Writing Tests
- Place tests next to the component/utility being tested
- Use descriptive test names
- Test both happy path and error cases
- Mock external dependencies

## 🎯 Areas for Contribution

### High Priority
- Security improvements
- Performance optimizations  
- Accessibility enhancements
- Test coverage improvements

### Features
- New Pokemon data integration
- Additional export formats
- Enhanced matchup analysis
- Mobile responsiveness

### Documentation
- Code comments and documentation
- Setup guides for different deployment methods
- Video tutorials or examples

## 📋 Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Prefer interfaces over types when possible
- Use strict type checking
- Avoid `any` types

### React
- Use functional components with hooks
- Implement proper error boundaries
- Use proper dependency arrays in useEffect
- Follow React best practices

### File Organization
```
src/
├── components/          # Reusable React components
├── auth/               # Authentication related code
├── utils/              # Utility functions
├── data/               # Static data files
└── hooks/              # Custom React hooks
```

### Import Organization
```typescript
// 1. Node modules
import React from 'react';
import { useState } from 'react';

// 2. Internal modules
import { logger } from '@/utils/logger';
import { AuthProvider } from '@/auth/AuthProvider';

// 3. Relative imports
import './Component.css';
```

## 🐛 Bug Reports

When reporting bugs, include:
- **Environment**: OS, browser, Node.js version
- **Steps to Reproduce**: Clear, step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Console Errors**: Any error messages

## 💡 Feature Requests

For feature requests:
- Search existing issues first
- Provide clear use case description
- Explain the problem it solves
- Consider implementation complexity
- Be open to discussion and iteration

## 🏗️ Architecture Decisions

### Technology Choices
- **React 19**: Latest React features
- **TypeScript**: Type safety and better DX
- **Local Storage**: Data persistence without backend dependency
- **GitHub OAuth**: Secure authentication
- **Express**: Simple backend API

### Design Principles
- **Security First**: Never expose secrets
- **Performance**: Optimize for fast loading
- **Accessibility**: WCAG 2.1 compliance
- **Mobile First**: Responsive design
- **Developer Experience**: Good tooling and documentation

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Discord/Slack**: [If available] For real-time chat

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to VGC Team Manager! 🎮