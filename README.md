# VGC Team Manager

A professional Pokémon VGC team planning and strategy tool with comprehensive gameplan management, matchup analysis, and PDF export capabilities.

## 🚀 Features

- **Team Management**: Create and organize comprehensive gameplans
- **Matchup Analysis**: Strategic analysis with searchable Pokémon selector
- **PDF Export**: Professional tournament-ready exports with sprites
- **Secure Authentication**: GitHub OAuth with granular access control
- **Modern UI**: Clean, responsive design with Poppins typography
- **Local Storage**: All data stays on your device

## 🔧 Development

### Prerequisites
- Node.js 18+ 
- npm

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mannyurbano/vgc-gameplan-manager-react.git
cd vgc-gameplan-manager-react

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start both backend and frontend servers (auth bypassed on localhost)
npm start

# Alternative: Start only frontend (for static hosting testing)
npm run start-frontend-only
```

### Development Scripts

```bash
npm start              # Start full development server
npm run lint           # Check code quality
npm run lint:fix       # Fix linting issues
npm run format         # Format code with Prettier
npm run type-check     # Check TypeScript types
npm run validate       # Run all quality checks
npm test               # Run tests
npm run build          # Build for production
```

### Environment Variables

Create a `.env` file in the project root:

```env
# GitHub OAuth (required for production)
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id
REACT_APP_GITHUB_REDIRECT_URI=https://your-username.github.io/vgc-gameplan-manager-react/auth/callback

# Optional: Dynamic user management via GitHub Gist
REACT_APP_AUTHORIZED_USERS_GIST_ID=your_gist_id
```

### Authorization

Edit the authorized users list in `src/auth/AuthProvider.tsx`:

```typescript
const AUTHORIZED_USERS = ['your-github-username', 'beta-user-1'];
```

## 🚀 Deployment

The app works in two modes:
- **Local Development**: Runs backend API + frontend (with file system access to `./gameplans/`)
- **Static Hosting**: Frontend-only (uses localStorage for data persistence)

### GitHub Pages Deployment

Update the homepage URL in `package.json`:
```json
"homepage": "https://your-username.github.io/vgc-gameplan-manager-react"
```

The app automatically deploys to GitHub Pages on every push to `main`:

1. **Enable GitHub Pages**: Go to Settings → Pages → Source: GitHub Actions
2. **Set Secrets**: Add required environment variables to repository secrets  
3. **Push to main**: Automatic build and deployment

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy to GitHub Pages (manual)
npm run deploy
```

## 🔐 Authentication Setup

1. **Create GitHub OAuth App**:
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Authorization callback URL: `https://your-username.github.io/vgc-gameplan-manager-react/auth/callback`

2. **Deploy OAuth Proxy** (Vercel):
   ```bash
   cd oauth-proxy
   vercel --prod
   ```

3. **Configure Environment Variables**:
   - Set GitHub repository secrets for production
   - Update authorized users list

## 🏗️ Build Options

```bash
npm run build              # Standard build
npm run build:obfuscated   # Code-protected build
npm run build:electron     # Desktop app build
npm run package:all        # All distribution formats
```

## 🧪 Testing

```bash
npm test                   # Run tests
npm run lint              # Check code quality
npm run lint:fix          # Fix linting issues
```

## 📁 Project Structure

```
src/
├── auth/                  # Authentication system
├── components/            # React components
├── data/                  # Static data (Pokémon, etc.)
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
└── App.tsx               # Main application
```

## 🔄 CI/CD

- **CI**: Runs tests and linting on all PRs
- **CD**: Deploys to GitHub Pages on main branch
- **Quality Gates**: ESLint, tests, build verification

## 📱 Supported Platforms

- **Web**: All modern browsers
- **Desktop**: Electron app (Windows, macOS, Linux)  
- **Mobile**: Progressive Web App capabilities

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run quality checks (`npm run validate`)
5. Commit your changes (`git commit -m '✨ Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Quality

Before submitting, ensure your code passes:
- TypeScript compilation (`npm run type-check`)
- Linting rules (`npm run lint`)
- Code formatting (`npm run format:check`)
- Unit tests (`npm test -- --watchAll=false`)

## 📄 License

This project is licensed under the MIT License.

---

Built for competitive VGC players 🎮
