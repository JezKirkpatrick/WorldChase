import type { Challenge, PlayerProgress, ChallengeStatus } from '@/types/game'

export const MAX_ATTEMPTS = 5
export const MAX_ATTEMPTS_EASY = 10
export const CLUE_COST = 1
export const SKIP_COST = 2

export function canRevealClue(clueIndex: number, progress: PlayerProgress): boolean {
  return progress.clues_revealed < clueIndex
}

export function isRoundLocked(roundNumber: number, allProgress: PlayerProgress[]): boolean {
  if (roundNumber === 1) return false
  const prev = allProgress.find(p => {
    return true // need challenge data to cross-reference — handled in component
  })
  return false
}

export function getNextUnlockedRound(allProgress: PlayerProgress[]): number {
  const completed = allProgress.filter(p =>
    p.status === 'completed' || p.status === 'skipped'
  )
  return completed.length + 1
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function getDifficultyColor(difficulty: string): string {
  const map: Record<string, string> = {
    easy:    'text-success',
    medium:  'text-electric',
    hard:    'text-warning',
    extreme: 'text-danger',
  }
  return map[difficulty] ?? 'text-gold'
}

export function getDifficultyBgColor(difficulty: string): string {
  const map: Record<string, string> = {
    easy:    'bg-success/20 border-success/40',
    medium:  'bg-electric/20 border-electric/40',
    hard:    'bg-warning/20 border-warning/40',
    extreme: 'bg-danger/20 border-danger/40',
  }
  return map[difficulty] ?? 'bg-gold/20 border-gold/40'
}
