const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://mannyurbano.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// --- GitHub OAuth session and passport setup ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3001/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // You can store user info in DB here if needed
    return done(null, profile);
  }
));

// --- GitHub OAuth routes ---
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] })
);

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    // Redirect to frontend after successful login
    res.redirect(process.env.FRONTEND_URL || '/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect(process.env.FRONTEND_URL || '/');
  });
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// --- OAuth Proxy Endpoint (Server-side with client secret) ---
app.post('/oauth/github/token', async (req, res) => {
  try {
    const { client_id, code, redirect_uri } = req.body;

    // Validate required parameters
    if (!client_id || !code) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('🔄 Exchanging authorization code for access token...');

    // Exchange authorization code for access token with GitHub (server-side)
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      console.log('✅ Access token obtained successfully');
      // Return only the access token (don't expose other sensitive data)
      res.json({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
      });
    } else {
      console.error('❌ Token exchange failed:', tokenData);
      res.status(400).json({
        error: tokenData.error || 'Token exchange failed',
        error_description: tokenData.error_description,
      });
    }
  } catch (error) {
    console.error('OAuth proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sample gameplan fallback
const SAMPLE_GAMEPLAN = {
  id: 'sample-gameplan',
  title: 'Sample VGC Gameplan: Basic Structure',
  content: `---
title: "Sample VGC Gameplan: Basic Structure"
tags: ["Sample", "Template", "VGC", "Structure", "Beginner"]
season: "2024"
tournament: "Practice"
format: "VGC"
author: "System"
dateCreated: "2025-07-14"
teamArchetype: "Balanced Sample Team"
coreStrategy: "Learn the gameplan format and structure"
---

# VGC Gameplan: Sample Structure

## Team Composition (6 Pokemon)

**Sample Mon 1** @ Item  
Ability: Sample Ability | Tera: Type  
EVs: 252 HP / 252 Atk / 4 Def | Nature  
- Move 1  
- Move 2  
- Move 3  
- Move 4  

[Add 5 more Pokemon in the same format...]

---

## Strategic Analysis: What Would I/My Rival Do?

### Lead Scenario 1: Mon 1 + Mon 2

**What would I do?**
- Option 1: Describe your play
- Option 2: Alternative approach
- Option 3: Situational choice

**What would my rival do?**
- Their likely response
- Counter-play options
- Setup attempts

**My Win Condition**: Your primary win condition
**Their Win Condition**: Opponent's likely win condition

---

## What Threatens This Team?

### Major Threats:
1. **Threat 1** - Why it's dangerous
2. **Threat 2** - How it counters your strategy
3. **Threat 3** - What makes it problematic

### Team Weaknesses:
- **Weakness 1**: Description of vulnerability
- **Weakness 2**: Strategic limitation
- **Weakness 3**: Matchup problems

---

## Matchup-Specific Strategies

### vs Common Archetype 1

**Key Picks**: Your recommended team selection

**Strategy**:
1. Step 1 of your gameplan
2. Step 2 of execution
3. Step 3 of follow-up
4. Step 4 of win condition

[Add more matchups as needed...]

**Note**: This is sample data. Add your actual gameplans to the gameplans folder.`,
  dateCreated: new Date().toISOString().split('T')[0],
  tags: ['Sample', 'Template', 'VGC', 'Structure', 'Beginner'],
  season: new Date().getFullYear().toString(),
  tournament: 'Sample',
  format: 'VGC'
};

// Helper function to parse YAML front matter and gameplan content
function parseGameplanMetadata(content, filename) {
  // Check if file has YAML front matter
  if (!content.startsWith('---')) {
    // Fallback to old parsing method for files without front matter
    return parseGameplanLegacy(content, filename);
  }

  try {
    // Extract YAML front matter
    const frontMatterEnd = content.indexOf('---', 3);
    if (frontMatterEnd === -1) {
      throw new Error('Invalid YAML front matter format');
    }

    const frontMatter = content.substring(3, frontMatterEnd);
    const mainContent = content.substring(frontMatterEnd + 3);

    // Parse YAML manually (simple key-value parsing)
    const metadata = {};
    const lines = frontMatter.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        let value = valueParts.join(':').trim();
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Parse arrays (simple bracket format)
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1)
            .split(',')
            .map(item => item.trim().replace(/['"]/g, ''))
            .filter(item => item);
        }
        
        metadata[key.trim()] = value;
      }
    }

    // Extract team composition from content (exactly 6 Pokemon)
    const teamPokemon = extractTeamPokemon(mainContent);
    
    // Extract rival teams and analysis data
    const rivalTeams = extractRivalTeams(mainContent);
    const analysis = extractAnalysisData(mainContent);

    return {
      title: metadata.title || filename.replace('.md', ''),
      tags: Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags].filter(Boolean),
      season: metadata.season || new Date().getFullYear().toString(),
      tournament: metadata.tournament || 'Practice',
      format: metadata.format || 'VGC',
      author: metadata.author || 'Unknown',
      teamArchetype: metadata.teamArchetype || 'Unknown',
      coreStrategy: metadata.coreStrategy || '',
      teamPokemon: teamPokemon,
      rivalTeams: rivalTeams,
      analysis: analysis,
      content: mainContent
    };

  } catch (error) {
    console.error('Error parsing YAML front matter:', error);
    return parseGameplanLegacy(content, filename);
  }
}

// Extract exactly 6 Pokemon from team composition section
function extractTeamPokemon(content) {
  const teamPokemon = [];
  const lines = content.split('\n');
  
  // Look for team composition section
  let inTeamSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('Team Composition') || line.includes('## Team')) {
      inTeamSection = true;
      continue;
    }
    
    if (inTeamSection && line.startsWith('##') && !line.includes('Team')) {
      break; // End of team section
    }
    
    if (inTeamSection) {
      // Look for Pokemon names in bold format: **Pokemon Name** or **Nickname (Pokemon Name)**
      const pokemonMatch = line.match(/^\*\*([^*]+)\*\*/);
      if (pokemonMatch) {
        let pokemonName = pokemonMatch[1].trim();
        
        // Remove item information if present (everything after @)
        const atIndex = pokemonName.indexOf('@');
        if (atIndex !== -1) {
          pokemonName = pokemonName.substring(0, atIndex).trim();
        }
        
        // Handle nickname format: "Nickname (Actual Pokemon Name)"
        const nicknameMatch = pokemonName.match(/^[^(]+\(([^)]+)\)$/);
        if (nicknameMatch) {
          pokemonName = nicknameMatch[1].trim();
        }
        
        if (pokemonName && teamPokemon.length < 6) {
          teamPokemon.push(pokemonName);
        }
      }
    }
  }
  
  return teamPokemon;
}

// Extract rival teams from matchup sections
function extractRivalTeams(content) {
  const rivalTeams = {};
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for matchup sections starting with "### vs "
    if (line.startsWith('### vs ')) {
      const opponentName = line.replace('### vs ', '').trim();
      const rivalPokemon = [];
      
      // Look ahead for Pokemon mentions in this matchup section
      for (let j = i + 1; j < lines.length && j < i + 30; j++) {
        const nextLine = lines[j].trim();
        
        // Stop if we hit another matchup section or major heading
        if ((nextLine.startsWith('### ') && nextLine !== line) || nextLine.startsWith('## ')) {
          break;
        }
        
        // Look for Pokemon names in various formats
        const pokemonMatches = nextLine.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g);
        if (pokemonMatches) {
          for (const match of pokemonMatches) {
            // Filter out common non-Pokemon words and check if it's a valid Pokemon
            if (isValidPokemonName(match) && !rivalPokemon.includes(match) && rivalPokemon.length < 6) {
              rivalPokemon.push(match);
            }
          }
        }
      }
      
      if (rivalPokemon.length > 0) {
        rivalTeams[opponentName] = rivalPokemon;
      }
    }
  }
  
  return rivalTeams;
}

// Extract analysis data from strategic sections
function extractAnalysisData(content) {
  const analysis = {};
  const lines = content.split('\n');
  
  // Extract likely leads
  const likelyLeads = [];
  const leadsSection = content.match(/likely leads?[:\s]*([\s\S]*?)(?=\n##|\n###|$)/i);
  if (leadsSection) {
    const leadLines = leadsSection[1].split('\n');
    for (const line of leadLines) {
      const pokemonMatch = line.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g);
      if (pokemonMatch) {
        for (const match of pokemonMatch) {
          if (isValidPokemonName(match) && !likelyLeads.includes(match)) {
            likelyLeads.push(match);
          }
        }
      }
    }
  }
  if (likelyLeads.length > 0) analysis.likelyLeads = likelyLeads;
  
  // Extract unlikely mons
  const unlikelyMons = [];
  const unlikelySection = content.match(/most likely they will NOT bring[:\s]*([\s\S]*?)(?=\n##|\n###|$)/i);
  if (unlikelySection) {
    const unlikelyLines = unlikelySection[1].split('\n');
    for (const line of unlikelyLines) {
      const pokemonMatch = line.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g);
      if (pokemonMatch) {
        for (const match of pokemonMatch) {
          if (isValidPokemonName(match) && !unlikelyMons.includes(match)) {
            unlikelyMons.push(match);
          }
        }
      }
    }
  }
  if (unlikelyMons.length > 0) analysis.unlikelyMons = unlikelyMons;
  
  // Extract threats to rival
  const threatsToRival = [];
  const threatsSection = content.match(/what threatens my rival[:\s]*([\s\S]*?)(?=\n##|\n###|$)/i);
  if (threatsSection) {
    const threatLines = threatsSection[1].split('\n');
    for (const line of threatLines) {
      const pokemonMatch = line.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g);
      if (pokemonMatch) {
        for (const match of pokemonMatch) {
          if (isValidPokemonName(match) && !threatsToRival.includes(match)) {
            threatsToRival.push(match);
          }
        }
      }
    }
  }
  if (threatsToRival.length > 0) analysis.threatsToRival = threatsToRival;
  
  // Extract rival pressure
  const rivalPressure = [];
  const pressureSection = content.match(/which mons from my rivals team pressure me[:\s]*([\s\S]*?)(?=\n##|\n###|$)/i);
  if (pressureSection) {
    const pressureLines = pressureSection[1].split('\n');
    for (const line of pressureLines) {
      const pokemonMatch = line.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g);
      if (pokemonMatch) {
        for (const match of pokemonMatch) {
          if (isValidPokemonName(match) && !rivalPressure.includes(match)) {
            rivalPressure.push(match);
          }
        }
      }
    }
  }
  if (rivalPressure.length > 0) analysis.rivalPressure = rivalPressure;
  
  // Extract win conditions
  const myWincon = [];
  const myWinconSection = content.match(/whats my wincon[:\s]*([\s\S]*?)(?=\n##|\n###|$)/i);
  if (myWinconSection) {
    const winconLines = myWinconSection[1].split('\n');
    for (const line of winconLines) {
      const pokemonMatch = line.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g);
      if (pokemonMatch) {
        for (const match of pokemonMatch) {
          if (isValidPokemonName(match) && !myWincon.includes(match)) {
            myWincon.push(match);
          }
        }
      }
    }
  }
  if (myWincon.length > 0) analysis.myWincon = myWincon;
  
  const theirWincon = [];
  const theirWinconSection = content.match(/whats their wincon[:\s]*([\s\S]*?)(?=\n##|\n###|$)/i);
  if (theirWinconSection) {
    const winconLines = theirWinconSection[1].split('\n');
    for (const line of winconLines) {
      const pokemonMatch = line.match(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g);
      if (pokemonMatch) {
        for (const match of pokemonMatch) {
          if (isValidPokemonName(match) && !theirWincon.includes(match)) {
            theirWincon.push(match);
          }
        }
      }
    }
  }
  if (theirWincon.length > 0) analysis.theirWincon = theirWincon;
  
  return analysis;
}

// Helper function to validate Pokemon names
function isValidPokemonName(name) {
  // Common non-Pokemon words to exclude
  const excludeWords = [
    'Turn', 'Lead', 'Back', 'Strategy', 'Why', 'This', 'Works', 'Options',
    'Protect', 'Fake', 'Out', 'Body', 'Press', 'Astral', 'Barrage', 'Wide',
    'Guard', 'Follow', 'Me', 'Spore', 'Tailwind', 'Bleakwind', 'Storm',
    'Taunt', 'Thunderbolt', 'Draco', 'Meteor', 'Thunderclap', 'Solar',
    'Beam', 'Grassy', 'Glide', 'Wood', 'Hammer', 'U-turn', 'Life', 'Orb',
    'Rusted', 'Shield', 'Focus', 'Sash', 'Covert', 'Cloak', 'Assault',
    'Vest', 'Clear', 'Amulet', 'Rocky', 'Helmet', 'Choice', 'Scarf',
    'Electro', 'Drift', 'Volt', 'Switch', 'Snarl', 'Glacial', 'Lance',
    'High', 'Horsepower', 'Trick', 'Room', 'Flare', 'Blitz', 'Knock',
    'Off', 'Pollen', 'Puff', 'Rage', 'Powder', 'Earth', 'Power', 'Sludge',
    'Bomb', 'Surging', 'Strikes', 'Close', 'Combat', 'Aqua', 'Jet',
    'Detect', 'Recommended', 'Primary', 'Secondary', 'Aggressive',
    'Defensive', 'Support', 'Control', 'Pressure', 'Setup', 'Cleanup',
    'Priority', 'Speed', 'Terrain', 'Weather', 'Status', 'Damage',
    'Health', 'Attack', 'Defense', 'Special', 'Evasion', 'Accuracy',
    'Critical', 'Hit', 'Miss', 'Flinch', 'Confusion', 'Paralysis',
    'Poison', 'Burn', 'Freeze', 'Sleep', 'Fainted', 'Switch', 'In',
    'Out', 'Mega', 'Evolution', 'Dynamax', 'Z-Move', 'Tera', 'Type',
    'Ability', 'Nature', 'EVs', 'IVs', 'Item', 'Move', 'Moves',
    'Team', 'Pokemon', 'Mon', 'Mons', 'Archetype', 'Core', 'Strategy',
    'Gameplan', 'Matchup', 'Opponent', 'Rival', 'Win', 'Loss', 'Draw',
    'Victory', 'Defeat', 'Battle', 'Fight', 'Combat', 'War', 'Peace',
    'Friend', 'Enemy', 'Ally', 'Foe', 'Partner', 'Leader', 'Follower',
    'Support', 'Attacker', 'Defender', 'Sweeper', 'Wall', 'Tank',
    'Glass', 'Cannon', 'Bulky', 'Fast', 'Slow', 'Strong', 'Weak',
    'Resist', 'Immune', 'Super', 'Effective', 'Not', 'Very', 'Normal',
    'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
    'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon',
    'Dark', 'Steel', 'Fairy', 'Stellar', 'Physical', 'Special',
    'Status', 'Contact', 'Non-contact', 'Priority', 'High', 'Low',
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'First', 'Second', 'Third', 'Fourth',
    'Fifth', 'Sixth', 'Last', 'Next', 'Previous', 'Current', 'Future',
    'Past', 'Present', 'Time', 'Space', 'Reality', 'Dimension',
    'World', 'Universe', 'Galaxy', 'Planet', 'Star', 'Moon', 'Sun',
    'Earth', 'Mars', 'Venus', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
    'Pluto', 'Mercury', 'Neptune', 'Ceres', 'Eris', 'Haumea', 'Makemake'
  ];
  
  return !excludeWords.includes(name) && name.length > 2 && name.length < 20;
}

// Legacy parsing for files without YAML front matter
function parseGameplanLegacy(content, filename) {
  const title = content.match(/^# (.+)/m)?.[1] || filename.replace('.md', '');
  
  // Extract Pokemon from content (legacy method, but limit to 6)
  const teamPokemon = extractTeamPokemon(content);
  
  // Extract additional tags from common VGC terms
  const vgcTerms = /(?:VGC|Regulation|Series|Championship|Tournament|Regional)/gi;
  const vgcMatches = content.match(vgcTerms) || [];
  
  // Create tags array combining Pokemon and VGC terms
  const tags = [
    ...teamPokemon,
    ...vgcMatches,
    'Team',
    'Strategy'
  ];
  
  // Extract season/format info
  const seasonMatch = content.match(/(?:Season|Series)\s+(\d+)/i);
  const formatMatch = content.match(/Format:\s*(\w+)/i) || ['', 'VGC'];
  
  return {
    title,
    tags: [...new Set(tags)],
    season: seasonMatch?.[1] || new Date().getFullYear().toString(),
    format: formatMatch[1] || 'VGC',
    tournament: 'Practice/Local',
    teamPokemon: teamPokemon,
    content: content
  };
}

// Convert markdown gameplan to JSON format
function convertGameplanToJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    const metadata = parseGameplanMetadata(content, filename);
    
    return {
      id: filename.replace('.md', ''),
      title: metadata.title,
      content: metadata.content || content,
      dateCreated: metadata.dateCreated || new Date().toISOString().split('T')[0],
      tags: metadata.tags || [],
      season: metadata.season,
      tournament: metadata.tournament,
      format: metadata.format,
      teamPokemon: metadata.teamPokemon || [],
      rivalTeams: metadata.rivalTeams || {},
      analysis: metadata.analysis || {}
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
}

// Get all gameplans
app.get('/api/gameplans', (req, res) => {
  try {
    const gameplansDir = path.join(__dirname, 'gameplans');
    
    // Check if gameplans directory exists
    if (!fs.existsSync(gameplansDir)) {
      console.log('Gameplans directory not found, returning sample data');
      return res.json([SAMPLE_GAMEPLAN]);
    }
    
    // Read all .md files from gameplans directory
    const files = fs.readdirSync(gameplansDir)
      .filter(file => file.endsWith('.md'))
      .sort();
    
    if (files.length === 0) {
      console.log('No gameplan files found, returning sample data');
      return res.json([SAMPLE_GAMEPLAN]);
    }
    
    // Convert each file to JSON
    const gameplans = files
      .map(file => convertGameplanToJson(path.join(gameplansDir, file)))
      .filter(gameplan => gameplan !== null);
    
    console.log(`Successfully loaded ${gameplans.length} gameplans from files`);
    res.json(gameplans);
    
  } catch (error) {
    console.error('Error loading gameplans:', error);
    res.json([SAMPLE_GAMEPLAN]);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VGC Gameplan API is running' });
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`VGC Gameplan API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Gameplans API: http://localhost:${PORT}/api/gameplans`);
}); 