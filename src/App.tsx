import React, { useState, useEffect } from 'react';
import './App.css';

interface Gameplan {
  id: string;
  title: string;
  content: string;
  dateCreated: string;
  tags: string[];
}

// Pokemon ID mapping for PokéAPI sprites
const POKEMON_ID_MAP: { [key: string]: number } = {
  'Calyrex-Shadow': 898, // Calyrex (Shadow Rider form)
  'Zamazenta': 889,
  'Smeargle': 235,
  'Tornadus': 641,
  'Raging Bolt': 1021, // Gen 9 Pokemon
  'Rillaboom': 812
};

// Pokemon Sprite Component using PokéAPI
const PokemonSprite: React.FC<{ pokemon: string; size?: number }> = ({ pokemon, size = 32 }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const pokemonId = POKEMON_ID_MAP[pokemon];
    if (pokemonId) {
      // Use PokéAPI official artwork
      const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
      setImageUrl(url);
      setLoading(false);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [pokemon]);

  if (loading) {
    return (
      <div className="pokemon-sprite pokemon-sprite-loading" style={{ width: size, height: size }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="pokemon-sprite pokemon-sprite-error" style={{ width: size, height: size }}>
        <span className="pokemon-placeholder">?</span>
      </div>
    );
  }

  return (
    <div className="pokemon-sprite" style={{ width: size, height: size }}>
      <img 
        src={imageUrl} 
        alt={pokemon}
        className="sprite-image"
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
};

// Extract Pokemon names from gameplan content
const extractPokemonFromContent = (content: string): string[] => {
  const pokemonNames = Object.keys(POKEMON_ID_MAP);
  const foundPokemon: string[] = [];
  
  pokemonNames.forEach(pokemon => {
    if (content.includes(pokemon)) {
      foundPokemon.push(pokemon);
    }
  });
  
  return foundPokemon;
};

const SAMPLE_GAMEPLAN: Gameplan = {
  id: '1',
  title: 'CSR ZAMA + Smeargle Team',
  content: `# VGC Gameplan: Calyrex-Shadow + Zamazenta + Smeargle Team

## Team Composition

### Core Pokémon
- **Space-Ghost (Calyrex-Shadow)** @ Life Orb
  - Ability: As One (Spectrier) | Tera: Dark
  - EVs: 28 HP / 36 Def / 180 SpA / 12 SpD / 252 Spe | Timid
  - Moves: Astral Barrage, Psychic, Nasty Plot, Protect

- **Mr.Pickles (Zamazenta)** @ Rusted Shield
  - Ability: Dauntless Shield | Tera: Grass
  - EVs: 204 HP / 4 Atk / 180 Def / 28 SpD / 92 Spe | Impish
  - Moves: Body Press, Heavy Slam, Wide Guard, Protect

- **BlancaPoison (Smeargle)** @ Focus Sash
  - Ability: Moody | Tera: Ghost
  - EVs: 12 HP / 244 Def / 252 Spe | Jolly
  - Moves: Spore, Decorate, Follow Me, Fake Out

### Support Pokémon
- **Saitama (Tornadus)** @ Sharp Beak
  - Ability: Prankster | Tera: Dragon
  - EVs: 244 HP / 116 Def / 44 SpA / 92 SpD / 12 Spe | Modest
  - Moves: Bleakwind Storm, Taunt, Tailwind, Protect

- **Zenitsu (Raging Bolt)** @ Booster Energy
  - Ability: Protosynthesis | Tera: Electric
  - EVs: 188 HP / 36 Def / 108 SpA / 36 SpD / 140 Spe | Modest
  - Moves: Thunderbolt, Draco Meteor, Thunderclap, Protect

- **He-Man (Rillaboom)** @ Assault Vest
  - Ability: Grassy Surge | Tera: Fire
  - EVs: 236 HP / 76 Atk / 4 Def / 140 SpD / 52 Spe | Adamant
  - Moves: Wood Hammer, U-turn, Grassy Glide, Fake Out

### Core Strategy
- **Lead Options**: Tornadus + Smeargle (Speed Control + Disruption)
- **Back Options**: Calyrex-Shadow + Zamazenta (Offensive + Defensive Core)
- **Alternative Leads**: Rillaboom + Smeargle (Grassy Terrain + Support)

---

## Bread & Butter Combos

### Decorate Combinations
**Smeargle Decorate + Protect** is the core combo. Decorate boosts Attack by +2, making any attackers extremely dangerous.

#### Best Decorate Targets (in order of preference):
1. **Calyrex-Shadow** - Astral Barrage becomes devastating
2. **Raging Bolt** - Thunderclap and Thunderbolt hit extremely hard
3. **Tornadus** - Bleakwind Storm becomes a major threat
4. **Zamazenta** - Body Press and Heavy Slam become lethal (last resort)

#### Example Damage Calculations:
- **Calyrex-Shadow +2 Astral Barrage**: Almost OHKOs Zamazenta
- **Tornadus +2 Bleakwind Storm**: Almost OHKOs Calyrex-Shadow
- **Raging Bolt +2 Thunderclap**: Massive damage to most targets

---

## Common Lead & Back Combinations

### Standard Lead Options:
1. **Tornadus + Smeargle** (Most Common)
2. **Rillaboom + Smeargle** (Grassy Terrain Support)
3. **Calyrex-Shadow + Zamazenta** (Offensive Pressure)

### Standard Back Options:
1. **Calyrex-Shadow + Zamazenta** (Offensive + Defensive Core)
2. **Raging Bolt + Zamazenta** (Special + Physical Coverage)
3. **Tornadus + Calyrex-Shadow** (Speed Control + Offense)

---

## Example Turn Sequences

### Turn Sequence 1: vs Raging Bolt + Incineroar Lead

#### Turn 1:
- **Tornadus**: Switch to Zamazenta (avoids Fake Out from Incineroar)
- **Smeargle**: Fake Out (targets Incineroar to prevent Fake Out)

#### Turn 2:
- **Zamazenta**: Body Press (targets non-Fake Out slot, likely Incineroar)
- **Smeargle**: Spore (puts one opponent to sleep)

#### Turn 3:
- **Zamazenta**: Continue pressure with Body Press
- **Smeargle**: Likely fainted, bring in Calyrex-Shadow
- **Result**: Free Astral Barrage + Body Press (one slot sleeping, other likely KO'd)

### Turn Sequence 2: Decorate Setup

#### Turn 1:
- **Smeargle**: Decorate (boosts partner by +2 Attack)
- **Partner**: Protect (safeguards the boost)

#### Turn 2:
- **Smeargle**: Follow Me (redirects attacks away from boosted partner)
- **Boosted Partner**: Unleash boosted attacks

---

## Key Synergies

### Speed Control + Offense:
- **Tornadus Tailwind** → **Calyrex-Shadow sweep**
- **Prankster priority** ensures speed advantage

### Disruption + Setup:
- **Smeargle Spore** → **Free setup turns**
- **Smeargle Follow Me** → **Protect boosted partners**

### Terrain + Priority:
- **Rillaboom Grassy Surge** → **Grassy Glide priority**
- **Healing from terrain** sustains team

---

## Matchup Analysis

### Plan 1: Mirror Match (Urshifu + Ogerpon + Incineroar)

**Opponent Team**: Urshifu + Ogerpon + Incineroar + [Other 3]

#### Lead Strategy
- **Lead**: Tornadus + Smeargle
- **Back**: Calyrex-Shadow + Zamazenta

#### Turn 1 Strategy
- **Tornadus**: Tailwind (Prankster priority) / Taunt / Bleakwind Storm
- **Smeargle**: Spore / Follow Me / Decorate
- **Priority**: Set up speed control and disrupt opponent's setup

Example turn one:
Torn, switch to zama (to avoid fake out from opponent, example opponnet Raging + Inci)
fake out with Smeargle

Turn 2
spore from smeargle 
body press into slot (non fake out inci for example)

Turn 3
smeargle might die by now, replace with csr
its then a free astral + body press (example, one slot would be sleeping and the other more likely would die)

#### Key Plays
1. **Speed Control**: Use Prankster Tailwind for guaranteed speed advantage
2. **Disruption**: Smeargle can Spore threats or use Follow Me to redirect
3. **Positioning**: Keep Calyrex-Shadow and Zamazenta safe in back
4. **Decorate**: Use Smeargle's Decorate to boost Calyrex-Shadow's damage output

#### Win Conditions
- Maintain speed control throughout the game
- Use Smeargle's utility to create favorable 2v2 scenarios
- Bring in boosted Calyrex-Shadow for late-game sweep
- Use Zamazenta's Wide Guard to protect from spread moves

---

## General Gameplan Notes

### Lead Combinations
- **Tornadus + Smeargle**: Standard lead for speed control and disruption
- **Rillaboom + Smeargle**: Alternative lead for Grassy Terrain support
- **Calyrex-Shadow + Zamazenta**: Offensive lead for immediate pressure

### Key Moves to Watch For
- **Urshifu**: Close Combat, Surging Strikes, Wicked Blow
- **Ogerpon**: Ivy Cudgel, Horn Leech, Wood Hammer
- **Incineroar**: Fake Out, Flare Blitz, Parting Shot

### Terrain Considerations
- **Grassy Terrain**: Rillaboom's Grassy Surge provides healing and boosts Grassy Glide
- **Positioning**: Consider terrain effects on move accuracy and damage
- **Wide Guard**: Use Zamazenta's Wide Guard against spread moves

### Tera Usage
- **Calyrex-Shadow**: Tera Dark for STAB Astral Barrage and type coverage
- **Zamazenta**: Tera Grass for Ground resistance and coverage
- **Smeargle**: Tera Ghost for immunity to Fake Out and Normal moves

---

## Team Weaknesses & Counters
- **Fairy Types**: Watch for strong Fairy moves against Calyrex-Shadow
- **Ground Types**: Protect Zamazenta from Ground coverage (Tera Grass helps)
- **Speed Control**: Opposing Tailwind can neutralize speed advantage
- **Dark Types**: Calyrex-Shadow is weak to Dark moves

## Practice Notes
- Test lead combinations against various team archetypes
- Practice positioning and switching patterns
- Refine move selection based on opponent tendencies
- Master Decorate timing for maximum Calyrex-Shadow damage output`,
  dateCreated: '2024-01-15',
  tags: ['Calyrex-Shadow', 'Zamazenta', 'Smeargle', 'Tornadus', 'Raging Bolt', 'Rillaboom']
};

function App() {
  const [gameplans, setGameplans] = useState<Gameplan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGameplan, setSelectedGameplan] = useState<Gameplan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });

  // Load data from localStorage on component mount
  useEffect(() => {
    console.log('Loading gameplans from localStorage...');
    const savedGameplans = localStorage.getItem('vgc-gameplans');
    console.log('Saved gameplans:', savedGameplans);
    
    if (savedGameplans) {
      try {
        const parsed = JSON.parse(savedGameplans);
        console.log('Parsed gameplans:', parsed);
        setGameplans(parsed);
      } catch (error) {
        console.error('Error parsing saved gameplans:', error);
        // If there's an error parsing, reset to sample data
        const initialData = [SAMPLE_GAMEPLAN];
        setGameplans(initialData);
        localStorage.setItem('vgc-gameplans', JSON.stringify(initialData));
      }
    } else {
      // Initialize with sample data
      console.log('No saved gameplans found, initializing with sample data');
      const initialData = [SAMPLE_GAMEPLAN];
      console.log('Sample gameplan:', SAMPLE_GAMEPLAN);
      setGameplans(initialData);
      localStorage.setItem('vgc-gameplans', JSON.stringify(initialData));
    }
  }, []);

  // Save to localStorage whenever gameplans change
  useEffect(() => {
    console.log('Saving gameplans to localStorage:', gameplans);
    localStorage.setItem('vgc-gameplans', JSON.stringify(gameplans));
  }, [gameplans]);

  // Get all unique tags
  const allTags = Array.from(new Set(gameplans.flatMap(gp => gp.tags)));
  console.log('All tags:', allTags);
  console.log('Current gameplans:', gameplans);

  // Filter and sort gameplans
  const filteredGameplans = gameplans
    .filter(gp => {
      const matchesSearch = gp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           gp.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           gp.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTag = !selectedTag || gp.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const openModal = (gameplan?: Gameplan) => {
    if (gameplan) {
      setSelectedGameplan(gameplan);
      setFormData({
        title: gameplan.title,
        content: gameplan.content,
        tags: gameplan.tags.join(', ')
      });
      setIsEditing(true);
    } else {
      setSelectedGameplan(null);
      setFormData({ title: '', content: '', tags: '' });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGameplan(null);
    setFormData({ title: '', content: '', tags: '' });
    setIsEditing(false);
  };

  const saveGameplan = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in both title and content fields.');
      return;
    }

    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    if (isEditing && selectedGameplan) {
      // Update existing gameplan
      const updatedGameplans = gameplans.map(gp =>
        gp.id === selectedGameplan.id
          ? { ...gp, title: formData.title, content: formData.content, tags }
          : gp
      );
      setGameplans(updatedGameplans);
    } else {
      // Create new gameplan
      const newGameplan: Gameplan = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        tags,
        dateCreated: new Date().toISOString().split('T')[0]
      };
      setGameplans([newGameplan, ...gameplans]);
    }

    closeModal();
  };

  const deleteGameplan = (id: string) => {
    if (window.confirm('Are you sure you want to delete this gameplan?')) {
      setGameplans(gameplans.filter(gp => gp.id !== id));
    }
  };

  const viewGameplan = (gameplan: Gameplan) => {
    setSelectedGameplan(gameplan);
    setIsModalOpen(true);
    setIsEditing(false);
  };

  const resetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This will restore the sample gameplan and delete all others.')) {
      const initialData = [SAMPLE_GAMEPLAN];
      setGameplans(initialData);
      localStorage.setItem('vgc-gameplans', JSON.stringify(initialData));
    }
  };

  const forceReloadSampleData = () => {
    console.log('Force reloading sample data...');
    localStorage.removeItem('vgc-gameplans');
    const initialData = [SAMPLE_GAMEPLAN];
    setGameplans(initialData);
    localStorage.setItem('vgc-gameplans', JSON.stringify(initialData));
    console.log('Sample data reloaded:', initialData);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎮 VGC Gameplan Manager</h1>
        <p>Manage your VGC team strategies and gameplans</p>
      </header>

      <div className="controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search gameplans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="filter-select"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'title')}
            className="sort-select"
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>

        <div className="action-buttons">
          <button onClick={() => openModal()} className="btn btn-primary">
            + New Gameplan
          </button>
          <button onClick={resetData} className="btn btn-secondary">
            Reset Data
          </button>
          <button onClick={forceReloadSampleData} className="btn btn-warning">
            Force Reload Sample Data
          </button>
        </div>
      </div>

      <div className="gameplans-grid">
        {filteredGameplans.map(gameplan => {
          const pokemonInPlan = extractPokemonFromContent(gameplan.content);
          
          return (
            <div key={gameplan.id} className="gameplan-card">
              <div className="card-header">
                <h3>{gameplan.title}</h3>
                <div className="card-actions">
                  <button onClick={() => viewGameplan(gameplan)} className="btn btn-sm">
                    View
                  </button>
                  <button onClick={() => openModal(gameplan)} className="btn btn-sm">
                    Edit
                  </button>
                  <button onClick={() => deleteGameplan(gameplan.id)} className="btn btn-sm btn-danger">
                    Delete
                  </button>
                </div>
              </div>
              
              {pokemonInPlan.length > 0 && (
                <div className="pokemon-sprites-row">
                  {pokemonInPlan.map(pokemon => (
                    <div key={pokemon} className="pokemon-sprite-container">
                      <PokemonSprite pokemon={pokemon} size={40} />
                      <span className="pokemon-name">{pokemon}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="card-content">
                <p>{gameplan.content.substring(0, 200)}...</p>
              </div>
              
              <div className="card-footer">
                <div className="tags">
                  {gameplan.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <div className="date">{gameplan.dateCreated}</div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGameplans.length === 0 && (
        <div className="no-results">
          <p>No gameplans found. Try adjusting your search or create a new gameplan!</p>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? 'Edit Gameplan' : selectedGameplan ? 'View Gameplan' : 'New Gameplan'}</h2>
              <button onClick={closeModal} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-content">
              {selectedGameplan && !isEditing ? (
                // View mode
                <div className="gameplan-view">
                  <h3>{selectedGameplan.title}</h3>
                  
                  {extractPokemonFromContent(selectedGameplan.content).length > 0 && (
                    <div className="pokemon-team-display">
                      <h4>Team Pokémon:</h4>
                      <div className="pokemon-sprites-grid">
                        {extractPokemonFromContent(selectedGameplan.content).map(pokemon => (
                          <div key={pokemon} className="pokemon-sprite-large">
                            <PokemonSprite pokemon={pokemon} size={64} />
                            <span className="pokemon-name-large">{pokemon}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="gameplan-content">
                    <pre>{selectedGameplan.content}</pre>
                  </div>
                  <div className="tags">
                    {selectedGameplan.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                  <div className="date">Created: {selectedGameplan.dateCreated}</div>
                </div>
              ) : (
                // Edit/Create mode
                <div className="gameplan-form">
                  <div className="form-group">
                    <label>Title:</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter gameplan title..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Content:</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      placeholder="Enter your gameplan content in markdown format..."
                      rows={20}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Tags (comma-separated):</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="e.g., Calyrex-Shadow, Zamazenta, Smeargle"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              {selectedGameplan && !isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                  Edit
                </button>
              ) : (
                <button onClick={saveGameplan} className="btn btn-primary">
                  {isEditing ? 'Update' : 'Save'}
                </button>
              )}
              <button onClick={closeModal} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
