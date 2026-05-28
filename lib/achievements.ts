export interface Achievement {
  id: string
  emoji: string
  label: string
  desc: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  tokenReward: number
  condition: (s: AchievementStats) => boolean
}

export interface AchievementStats {
  completed: number
  totalScore: number
  bestTime: number   // seconds, Infinity if none
  noClueWin: boolean
  streak: number
  tokens: number
  skipped: number
  hardCompleted: number
  extremeCompleted: number
  perfectMonth: boolean  // all 20 completed
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── PROGRESS ──
  { id: 'first_blood',   emoji: '🩸', label: 'First Blood',     rarity: 'common',    tokenReward: 1,  desc: 'Complete your first round',            condition: s => s.completed >= 1 },
  { id: 'explorer_5',    emoji: '🗺', label: 'Explorer',        rarity: 'common',    tokenReward: 2,  desc: 'Complete 5 rounds',                    condition: s => s.completed >= 5 },
  { id: 'veteran_10',    emoji: '🎖', label: 'Veteran',         rarity: 'rare',      tokenReward: 3,  desc: 'Complete 10 rounds',                   condition: s => s.completed >= 10 },
  { id: 'elite_15',      emoji: '🏅', label: 'Elite',           rarity: 'epic',      tokenReward: 5,  desc: 'Complete 15 rounds',                   condition: s => s.completed >= 15 },
  { id: 'completionist', emoji: '🏆', label: 'Completionist',   rarity: 'legendary', tokenReward: 12, desc: 'Complete all 20 rounds in one month',   condition: s => s.completed >= 20 },
  { id: 'perfect_month', emoji: '💯', label: 'Perfect Month',   rarity: 'legendary', tokenReward: 25, desc: 'Complete all 20 rounds without skipping',condition: s => s.perfectMonth },

  // ── SPEED ──
  { id: 'speed_demon',   emoji: '⚡', label: 'Speed Demon',     rarity: 'rare',      tokenReward: 3,  desc: 'Solve a round in under 60 seconds',    condition: s => s.bestTime < 60 },
  { id: 'lightning',     emoji: '🌩', label: 'Lightning',       rarity: 'epic',      tokenReward: 5,  desc: 'Solve a round in under 30 seconds',    condition: s => s.bestTime < 30 },

  // ── SKILL ──
  { id: 'sharp_eye',     emoji: '🎯', label: 'Sharp Eye',       rarity: 'rare',      tokenReward: 3,  desc: 'Solve a round using zero clues',       condition: s => s.noClueWin },
  { id: 'hard_hunter',   emoji: '🏔', label: 'Hard Hunter',     rarity: 'rare',      tokenReward: 3,  desc: 'Complete 3 hard difficulty rounds',     condition: s => s.hardCompleted >= 3 },
  { id: 'extreme_hunter',emoji: '🌋', label: 'Extreme Hunter',  rarity: 'epic',      tokenReward: 8,  desc: 'Complete 3 extreme difficulty rounds',  condition: s => s.extremeCompleted >= 3 },
  { id: 'no_skip',       emoji: '🔒', label: 'No Retreat',      rarity: 'rare',      tokenReward: 3,  desc: 'Complete 10 rounds without ever skipping',condition: s => s.completed >= 10 && s.skipped === 0 },

  // ── SCORE ──
  { id: 'scorer_10k',    emoji: '💫', label: 'Rising Star',     rarity: 'common',    tokenReward: 1,  desc: 'Earn 10,000 total points',             condition: s => s.totalScore >= 10000 },
  { id: 'scorer_50k',    emoji: '🌟', label: 'Star Hunter',     rarity: 'rare',      tokenReward: 3,  desc: 'Earn 50,000 total points',             condition: s => s.totalScore >= 50000 },
  { id: 'scorer_100k',   emoji: '💥', label: 'Supernova',       rarity: 'epic',      tokenReward: 8,  desc: 'Earn 100,000 total points',            condition: s => s.totalScore >= 100000 },
  { id: 'scorer_500k',   emoji: '👁', label: 'The Oracle',      rarity: 'legendary', tokenReward: 20, desc: 'Earn 500,000 total points',            condition: s => s.totalScore >= 500000 },

  // ── STREAKS ──
  { id: 'streak_3',      emoji: '🔥', label: 'On Fire',         rarity: 'common',    tokenReward: 1,  desc: '3-day login streak',                   condition: s => s.streak >= 3 },
  { id: 'streak_7',      emoji: '🌪', label: 'Relentless',      rarity: 'rare',      tokenReward: 3,  desc: '7-day login streak',                   condition: s => s.streak >= 7 },
  { id: 'streak_30',     emoji: '♾', label: 'Unstoppable',     rarity: 'legendary', tokenReward: 15, desc: '30-day login streak',                  condition: s => s.streak >= 30 },

  // ── TOKEN / ECONOMY ──
  { id: 'token_50',      emoji: '💰', label: 'Token Hoarder',   rarity: 'common',    tokenReward: 0,  desc: 'Accumulate 50 tokens at once',          condition: s => s.tokens >= 50 },
  { id: 'token_200',     emoji: '🏦', label: 'Vault Keeper',    rarity: 'rare',      tokenReward: 0,  desc: 'Accumulate 200 tokens at once',         condition: s => s.tokens >= 200 },
]

export const RARITY_COLOR: Record<string, string> = {
  common:    'rarity-common',
  rare:      'rarity-rare',
  epic:      'rarity-epic',
  legendary: 'rarity-legendary',
}

export const RARITY_LABEL: Record<string, string> = {
  common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY',
}
