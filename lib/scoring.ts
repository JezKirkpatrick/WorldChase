import type { Difficulty, ScoreCalculation } from '@/types/game'

const BASE_POINTS: Record<Difficulty, number> = {
  easy:    500,
  medium:  1000,
  hard:    2500,
  extreme: 5000,
}

const CLUE_MULTIPLIERS_EASY: Record<number, number> = {
  0: 1.0,
  1: 0.95,
  2: 0.88,
  3: 0.80,
}

const CLUE_MULTIPLIERS_DEFAULT: Record<number, number> = {
  0: 1.0,
  1: 0.80,
  2: 0.60,
  3: 0.40,
}

const ATTEMPT_PENALTY_PER_WRONG = 0.05
const MAX_ATTEMPT_PENALTY       = 0.25

// Speed multiplier: exponential decay centred on 5 minutes
// t = 0s  → 2.0×  (you knew it cold)
// t = 5m  → 1.0×  (neutral baseline)
// t = 10m → 0.5×  (floor — same as Googling)
const SPEED_HALF_LIFE   = 300   // seconds until multiplier halves (= 5 min = 1.0×)
const SPEED_MAX         = 2.0
const SPEED_FLOOR       = 0.5

function calcSpeedMultiplier(seconds: number, floor = SPEED_FLOOR): number {
  const k = Math.LN2 / SPEED_HALF_LIFE
  return Math.max(floor, SPEED_MAX * Math.exp(-k * seconds))
}

export function calculateScore(
  difficulty: Difficulty,
  cluesRevealed: number,
  wrongAttempts: number,
  timeTakenSeconds: number
): ScoreCalculation {
  const basePoints      = BASE_POINTS[difficulty]
  const clueTable       = difficulty === 'easy' ? CLUE_MULTIPLIERS_EASY : CLUE_MULTIPLIERS_DEFAULT
  const clueMultiplier  = clueTable[Math.min(cluesRevealed, 3)]
  const attemptPenalty  = Math.min(wrongAttempts * ATTEMPT_PENALTY_PER_WRONG, MAX_ATTEMPT_PENALTY)
  const speedFloor      = difficulty === 'easy' ? 0.75 : SPEED_FLOOR
  const speedMultiplier = calcSpeedMultiplier(timeTakenSeconds, speedFloor)

  const afterClues    = basePoints * clueMultiplier
  const afterAttempts = afterClues * (1 - attemptPenalty)
  const finalScore    = Math.round(afterAttempts * speedMultiplier)

  return { basePoints, clueMultiplier, attemptPenalty, speedMultiplier, finalScore }
}

export function getMaxScore(difficulty: Difficulty): number {
  return Math.round(BASE_POINTS[difficulty] * SPEED_MAX)  // perfect score now 2× base
}

export function getPreviewScore(difficulty: Difficulty, cluesRevealed: number, wrongAttempts: number): number {
  // Preview assumes neutral speed (5-minute answer)
  const { finalScore } = calculateScore(difficulty, cluesRevealed, wrongAttempts, SPEED_HALF_LIFE)
  return finalScore
}
