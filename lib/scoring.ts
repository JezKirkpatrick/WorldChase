import type { Difficulty, ScoreCalculation } from '@/types/game'

const BASE_POINTS: Record<Difficulty, number> = {
  easy: 500,
  medium: 1000,
  hard: 2500,
  extreme: 5000,
}

const CLUE_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 0.80,
  2: 0.60,
  3: 0.40,
}

const ATTEMPT_PENALTY_PER_WRONG = 0.05
const MAX_ATTEMPT_PENALTY = 0.25
const SPEED_BONUS_MULTIPLIER = 0.10
const SPEED_BONUS_WINDOW_SECONDS = 600

export function calculateScore(
  difficulty: Difficulty,
  cluesRevealed: number,
  wrongAttempts: number,
  timeTakenSeconds: number
): ScoreCalculation {
  const basePoints = BASE_POINTS[difficulty]
  const clueMultiplier = CLUE_MULTIPLIERS[Math.min(cluesRevealed, 3)]
  const attemptPenalty = Math.min(wrongAttempts * ATTEMPT_PENALTY_PER_WRONG, MAX_ATTEMPT_PENALTY)
  const speedBonus = timeTakenSeconds <= SPEED_BONUS_WINDOW_SECONDS ? SPEED_BONUS_MULTIPLIER : 0

  const afterClues = basePoints * clueMultiplier
  const afterAttempts = afterClues * (1 - attemptPenalty)
  const afterSpeed = afterAttempts * (1 + speedBonus)
  const finalScore = Math.round(afterSpeed)

  return { basePoints, clueMultiplier, attemptPenalty, speedBonus, finalScore }
}

export function getMaxScore(difficulty: Difficulty): number {
  return BASE_POINTS[difficulty]
}

export function getPreviewScore(difficulty: Difficulty, cluesRevealed: number, wrongAttempts: number): number {
  const { finalScore } = calculateScore(difficulty, cluesRevealed, wrongAttempts, 9999)
  return finalScore
}
