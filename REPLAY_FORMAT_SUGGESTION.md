# Replay Format Suggestion

## Current Format Issues
The current format uses `**Replay Examples:**` for both:
1. General replays in the "## Replay Examples" section
2. Gameplan-specific replays within each gameplan

This makes it difficult to distinguish between them programmatically.

## Suggested Improved Format

### For General Replays (keep current)
```markdown
## Replay Examples

### vs Calyrex-Ice + Amoonguss
**Replay:** https://replay.pokemonshowdown.com/gen9vgc2025-1234567890
**Notes:** Perfect execution of the gameplan...
```

### For Gameplan-Specific Replays (new format)
```markdown
### Gameplan 1: vs Calyrex-Ice + Amoonguss
**Opponent Lead:** Calyrex-Ice + Amoonguss
**Opponent Back:** Incineroar + Landorus
**My Lead:** Koraidon + Tornadus
**My Back:** Urshifu + Calyrex-Shadow
**Their Wincon:** Set up Trick Room, sweep with Calyrex-Ice
**My Wincon:** Prevent Trick Room, sweep with Koraidon
**First 3 Turns:**
- Turn 1: Koraidon Collision Course on Calyrex-Ice, Tornadus Tailwind
- Turn 2: Koraidon Flare Blitz on their back, Tornadus Taunt on Amoonguss
- Turn 3: Koraidon Collision Course on their back, Tornadus Bleakwind Storm

**Replay Examples-G1:**
- **Replay:** https://replay.pokemonshowdown.com/gen9vgc2025-1234567890
  **Result:** Win
  **Notes:** Perfect execution. Koraidon OHKO'd their Calyrex-Ice on turn 1...

- **Replay:** https://replay.pokemonshowdown.com/gen9vgc2025-1234567891
  **Result:** Loss
  **Notes:** They led differently than expected...

**Damage Calculations:**
...
```

## Benefits of New Format
1. **Clear distinction**: `**Replay Examples:**` for general, `**Replay Examples-G1:**` for gameplan 1
2. **Better parsing**: Easy to identify which replays belong to which gameplan
3. **Backward compatibility**: Current format still works
4. **Scalability**: Can easily add G2, G3, etc. for multiple gameplans

## Implementation
The extraction function would look for:
- `**Replay Examples-G1:**` for Gameplan 1 replays
- `**Replay Examples-G2:**` for Gameplan 2 replays
- `**Replay Examples:**` for general replays (fallback) 