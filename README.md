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

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/vgc-gameplan-manager-react.git
cd vgc-gameplan-manager-react

# Install dependencies
npm install

# Start both backend and frontend servers (auth bypassed on localhost)
npm start

# Alternative: Start only frontend (for static hosting testing)
npm run start-frontend-only
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

## 🎨 Adding Pokemon Form Sprites

When Pokemon forms like "Maushold-Four", "Ursaluna-Bloodmoon", or "Ninetales-Alola" show as "?" instead of sprites, follow these steps:

### Step 1: Find the Correct PokemonDB Sprite URL

Test potential URLs to find the working sprite:

```bash
# Test the most likely URL format
curl -I "https://img.pokemondb.net/sprites/home/normal/pokemon-form.png"

# Common patterns:
# Alolan forms: ninetales-alolan.png
# Bloodmoon forms: ursaluna-bloodmoon.png  
# Family forms: maushold (uses base sprite)
```

### Step 2: Add Form Mapping in App.tsx

In the `pokemonFormMap` object (around line 470), add the new form:

```typescript
// Find this section in getPokemonSpriteUrl function
const pokemonFormMap: { [key: string]: string } = {
  // ... existing forms ...
  
  // Add your new form here
  'Pokemon-Form': 'pokemon-form-slug',
  
  // Examples:
  'Ninetales-Alola': 'ninetales-alolan',
  'Ursaluna-Bloodmoon': 'ursaluna-bloodmoon',
  'Maushold-Four': 'maushold', // Uses base sprite
};
```

### Step 3: Add Form to Text Extraction

In the `extractPokemonFromText` function (around line 1260), add to `knownForms` array:

```typescript
const knownForms = [
  // ... existing forms ...
  'Pokemon-Form', // Add your new form here
  
  // Examples:
  'Ninetales-Alola',
  'Ursaluna-Bloodmoon', 
  'Maushold-Four',
];
```

### Step 4: Test the Changes

1. Save the file and refresh the application
2. Check that sprites display in:
   - Team composition sections
   - Gameplans section
   - Matchup displays
3. Verify the sprite loads correctly (not "?")

### Step 5: Common Form Patterns

| Form Type | Example | PokemonDB Slug Pattern |
|-----------|---------|----------------------|
| Alolan | Ninetales-Alola | `pokemon-alolan` |
| Galarian | Rapidash-Galar | `pokemon-galarian` |
| Bloodmoon | Ursaluna-Bloodmoon | `pokemon-bloodmoon` |
| Family sizes | Maushold-Four | Use base `pokemon` |
| Therian | Landorus-Therian | `pokemon-therian` |
| Regional | Tauros-Paldea-Combat | `pokemon-paldea-combat` |

### Troubleshooting

- **404 errors**: Try different slug variations (alolan vs alola, combat vs fighting)
- **Still showing "?"**: Check browser console for image loading errors
- **Form not recognized**: Ensure it's added to both mapping locations
- **Case sensitivity**: All form names should use proper capitalization

## 🔄 CI/CD

- **CI**: Runs tests and linting on all PRs
- **CD**: Deploys to GitHub Pages on main branch
- **Quality Gates**: ESLint, tests, build verification

## 📱 Supported Platforms

- **Web**: All modern browsers
- **Desktop**: Electron app (Windows, macOS, Linux)  
- **Mobile**: Progressive Web App capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

Built for competitive VGC players 🎮
