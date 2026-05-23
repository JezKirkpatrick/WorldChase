'use client'
import type { Challenge, PlayerProgress, Clue, Guess } from '@/types/game'
import ClueReveal from './ClueReveal'
import AnswerInput from './AnswerInput'
import TokenHUD from './TokenHUD'
import { MAX_ATTEMPTS } from '@/lib/gameLogic'

interface RiddlePanelProps {
  challenge: Challenge
  progress: PlayerProgress
  revealedClues: Clue[]
  guesses: Guess[]
  tokens: number
  lastFeedback: string | null
  lastCorrect: boolean | null
  focusTrigger: number
  onRevealClue: (index: number) => Promise<void>
  onSubmitAnswer: (answer: string) => Promise<void>
  onSkip: () => void
}

export default function RiddlePanel({
  challenge, progress, revealedClues, guesses, tokens,
  lastFeedback, lastCorrect, focusTrigger,
  onRevealClue, onSubmitAnswer, onSkip
}: RiddlePanelProps) {
  const wrongAttempts = guesses.filter(g => !g.is_correct).length

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-navy-light border-r border-white/10">
      {/* Mission Briefing */}
      <div className="p-5 border-b border-white/10 bg-grid-pattern relative">
        <div className="text-xs text-gold font-head font-bold tracking-widest mb-3 flex items-center gap-2">
          MISSION BRIEFING
          <div className="flex-1 h-px bg-gold/20" />
        </div>
        <p className="text-text font-head text-base leading-relaxed">{challenge.riddle_text}</p>
      </div>

      {/* Clues */}
      <div className="p-5 border-b border-white/10 flex-1">
        <ClueReveal
          clues={challenge.clues}
          revealedCount={progress.clues_revealed}
          tokens={tokens}
          onReveal={onRevealClue}
        />
      </div>

      {/* Answer */}
      <div className="p-5 border-b border-white/10">
        <AnswerInput
          difficulty={challenge.difficulty}
          cluesRevealed={progress.clues_revealed}
          attempts={progress.attempts}
          maxAttempts={MAX_ATTEMPTS}
          lastFeedback={lastFeedback}
          lastCorrect={lastCorrect}
          onSubmit={onSubmitAnswer}
          onSkip={onSkip}
          tokens={tokens}
          focusTrigger={focusTrigger}
        />
      </div>

      {/* Token status */}
      <div className="p-5">
        <TokenHUD tokens={tokens} />
      </div>
    </div>
  )
}
