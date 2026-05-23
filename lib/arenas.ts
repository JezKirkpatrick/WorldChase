export interface Arena {
  level: number
  name: string
  emoji: string
  minTrophies: number       // trophies required to reach this arena (Infinity = ELO-gated)
  tokenWager: number        // tokens wagered per match in this arena
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  titleReward: string       // cosmetic title unlocked on first entry
  borderReward: string      // cosmetic border unlocked on first entry
  description: string
  isEloMode: boolean        // Arena 9 uses ELO instead of trophies
  color: string             // accent color for UI
}

export const ARENAS: Arena[] = [
  {
    level: 1,
    name: 'Explorer',
    emoji: '🗺',
    minTrophies: 0,
    tokenWager: 10,
    difficulty: 'easy',
    titleReward: 'Explorer',
    borderReward: 'Arena 1 Border',
    description: 'Every legend begins somewhere.',
    isEloMode: false,
    color: '#a0a0b0',
  },
  {
    level: 2,
    name: 'Navigator',
    emoji: '🧭',
    minTrophies: 50,
    tokenWager: 25,
    difficulty: 'easy',
    titleReward: 'Navigator',
    borderReward: 'Arena 2 Border',
    description: 'Chart your course through familiar territory.',
    isEloMode: false,
    color: '#78a0c8',
  },
  {
    level: 3,
    name: 'Cartographer',
    emoji: '📐',
    minTrophies: 150,
    tokenWager: 50,
    difficulty: 'medium',
    titleReward: 'Cartographer',
    borderReward: 'Arena 3 Border',
    description: 'Map the unknown. Read the land.',
    isEloMode: false,
    color: '#00d4ff',
  },
  {
    level: 4,
    name: 'Pathfinder',
    emoji: '🧗',
    minTrophies: 300,
    tokenWager: 100,
    difficulty: 'medium',
    titleReward: 'Pathfinder',
    borderReward: 'Arena 4 Border',
    description: 'No path too obscure, no clue too hidden.',
    isEloMode: false,
    color: '#00c896',
  },
  {
    level: 5,
    name: 'Trailblazer',
    emoji: '🔥',
    minTrophies: 500,
    tokenWager: 200,
    difficulty: 'hard',
    titleReward: 'Trailblazer',
    borderReward: 'Arena 5 Border',
    description: 'Forge ahead where others falter.',
    isEloMode: false,
    color: '#f59e0b',
  },
  {
    level: 6,
    name: 'Wayfarer',
    emoji: '⚔️',
    minTrophies: 750,
    tokenWager: 350,
    difficulty: 'hard',
    titleReward: 'Wayfarer',
    borderReward: 'Arena 6 Border',
    description: 'The world bends to those who know it.',
    isEloMode: false,
    color: '#f97316',
  },
  {
    level: 7,
    name: 'Pioneer',
    emoji: '🏔',
    minTrophies: 1000,
    tokenWager: 500,
    difficulty: 'expert',
    titleReward: 'Pioneer',
    borderReward: 'Arena 7 Border',
    description: 'Elite hunters operate at this level.',
    isEloMode: false,
    color: '#a855f7',
  },
  {
    level: 8,
    name: 'Sovereign',
    emoji: '👑',
    minTrophies: 1350,
    tokenWager: 750,
    difficulty: 'expert',
    titleReward: 'Sovereign',
    borderReward: 'Arena 8 Border',
    description: 'Rule your domain. Prove your dominance.',
    isEloMode: false,
    color: '#f5c518',
  },
  {
    level: 9,
    name: 'Hall of Champions',
    emoji: '🏆',
    minTrophies: Infinity,   // reached only via top-league promotion from Arena 8
    tokenWager: 1000,
    difficulty: 'expert',
    titleReward: 'Hall of Champions',
    borderReward: 'Hall of Champions Border',
    description: 'The pinnacle. Global ELO ranking. True glory.',
    isEloMode: true,
    color: '#ff6b35',
  },
]

export const ARENA_BY_LEVEL: Record<number, Arena> = Object.fromEntries(
  ARENAS.map(a => [a.level, a])
)

/** Returns the arena a player belongs to based on their trophy count (arenas 1-8 only). */
export function getArenaForTrophies(trophies: number): Arena {
  for (let i = ARENAS.length - 2; i >= 0; i--) {   // skip Arena 9 (index 8)
    if (trophies >= ARENAS[i].minTrophies) return ARENAS[i]
  }
  return ARENAS[0]
}

/** Trophies needed to reach the next arena, or null if already at cap. */
export function trophiesToNextArena(trophies: number, currentLevel: number): number | null {
  if (currentLevel >= 8) return null   // Arena 8 → 9 is promotion-based, not trophy-based
  const next = ARENA_BY_LEVEL[currentLevel + 1]
  if (!next) return null
  return Math.max(0, next.minTrophies - trophies)
}

/** Token wager amounts indexed by arena level (1-9). */
export const ARENA_WAGERS: Record<number, number> = Object.fromEntries(
  ARENAS.map(a => [a.level, a.tokenWager])
)

/** Arena min-trophy thresholds for arenas 1-8, 1-indexed. */
export const ARENA_THRESHOLDS: Record<number, number> = Object.fromEntries(
  ARENAS.filter(a => !a.isEloMode).map(a => [a.level, a.minTrophies])
)

/** Challenge difficulty (DB value) for each arena level. */
export function getArenaChallengeDifficulty(arenaLevel: number): 'easy' | 'medium' | 'hard' | 'extreme' {
  if (arenaLevel <= 2) return 'easy'
  if (arenaLevel <= 4) return 'medium'
  if (arenaLevel <= 6) return 'hard'
  return 'extreme'
}

/** Per-difficulty time limit (seconds) and max clues available. */
export const DIFFICULTY_CONFIG = {
  easy:    { timeLimit: 90, maxClues: 3 },
  medium:  { timeLimit: 75, maxClues: 2 },
  hard:    { timeLimit: 60, maxClues: 1 },
  extreme: { timeLimit: 45, maxClues: 0 },
} as const

/** Max players per match format. */
export const MATCH_CAPACITY: Record<string, number> = { '1v1': 2, '2v2': 4, 'ffa5': 5 }
