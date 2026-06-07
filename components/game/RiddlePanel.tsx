'use client'
import Link from 'next/link'
import type { Challenge, PlayerProgress, Clue, Guess } from '@/types/game'
import ClueReveal from './ClueReveal'
import AnswerInput from './AnswerInput'
import TokenHUD from './TokenHUD'
import { MAX_ATTEMPTS, MAX_ATTEMPTS_EASY } from '@/lib/gameLogic'

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
  onSubmitAnswer: (answer: string) => Promise<boolean>
  onSkip: () => void
}

export default function RiddlePanel({
  challenge, progress, revealedClues, guesses, tokens,
  lastFeedback, lastCorrect, focusTrigger,
  onRevealClue, onSubmitAnswer, onSkip
}: RiddlePanelProps) {
  const wrongAttempts = guesses.filter(g => !g.is_correct).length
  const isCompleted = progress.status === 'completed'

  function blockCopy(e: React.ClipboardEvent) {
    e.preventDefault()
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-navy-light border-r border-white/10">

      {/* Replay banner */}
      {isCompleted && (
        <div className="px-5 py-3 bg-success/10 border-b border-success/30 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-head font-bold text-success tracking-widest">REVIEW MODE</div>
            <div className="text-xs font-head text-text-muted mt-0.5">
              Answer: <span className="text-white font-bold">{challenge.location_name}, {challenge.location_country}</span>
            </div>
          </div>
          <Link href="/play" className="text-xs font-head text-gold hover:text-gold-dim transition-colors shrink-0">
            ← ROUNDS
          </Link>
        </div>
      )}

      {/* Street View navigation tip — only shown on sv-only rounds while active */}
      {!isCompleted && (challenge as any).street_view_only && (
        <div className="px-5 py-2 bg-electric/10 border-b border-electric/30 flex items-center gap-2">
          <span className="text-electric text-xs shrink-0">📷</span>
          <span className="text-electric font-head text-xs leading-snug">
            Use the <strong>arrows on the map</strong> to navigate — the answer is visible from street level.
          </span>
        </div>
      )}

      {/* Mission Briefing */}
      <div className="p-5 border-b border-white/10 bg-grid-pattern relative">
        <div className="text-xs text-gold font-head font-bold tracking-widest mb-3 flex items-center gap-2">
          MISSION BRIEFING
          <div className="flex-1 h-px bg-gold/20" />
        </div>
        <p
          className="text-text font-head text-base leading-relaxed select-none"
          onCopy={blockCopy}
        >
          {challenge.riddle_text}
        </p>
      </div>

      {/* Clues — show all when replaying a completed level */}
      <div className="p-5 border-b border-white/10 flex-1" onCopy={blockCopy}>
        <ClueReveal
          clues={challenge.clues}
          revealedCount={isCompleted ? (challenge.clues?.length ?? 1) - 1 : progress.clues_revealed}
          tokens={tokens}
          onReveal={onRevealClue}
          readOnly={isCompleted}
          freeClues={challenge.difficulty === 'easy'}
        />
      </div>

      {/* Answer section — completion summary in replay, normal input otherwise */}
      <div className="p-5 border-b border-white/10">
        {isCompleted ? (
          <div className="space-y-3">
            <div className="text-xs text-gold font-head font-bold tracking-widest flex items-center gap-2">
              MISSION COMPLETE
              <div className="flex-1 h-px bg-gold/20" />
            </div>
            <div className="border border-success/30 bg-success/5 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-head text-text-muted tracking-wider">SCORE EARNED</span>
                <span className="font-mono font-bold text-success text-lg">+{progress.score_earned?.toLocaleString() ?? 0}</span>
              </div>
              {progress.time_taken_seconds != null && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-head text-text-muted tracking-wider">TIME TAKEN</span>
                  <span className="font-mono text-sm text-white">
                    {Math.floor(progress.time_taken_seconds / 60)}m {progress.time_taken_seconds % 60}s
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs font-head text-text-muted tracking-wider">ATTEMPTS USED</span>
                <span className="font-mono text-sm text-white">{progress.attempts}</span>
              </div>
            </div>
            {challenge.fun_fact && (
              <div className="text-xs font-head text-text-muted leading-relaxed border-t border-white/10 pt-3">
                <span className="text-gold font-bold">FUN FACT: </span>{challenge.fun_fact}
              </div>
            )}
          </div>
        ) : (
          <AnswerInput
            difficulty={challenge.difficulty}
            cluesRevealed={progress.clues_revealed}
            attempts={progress.attempts}
            maxAttempts={challenge.difficulty === 'easy' ? MAX_ATTEMPTS_EASY : MAX_ATTEMPTS}
            lastFeedback={lastFeedback}
            lastCorrect={lastCorrect}
            onSubmit={onSubmitAnswer}
            onSkip={onSkip}
            tokens={tokens}
            focusTrigger={focusTrigger}
          />
        )}
      </div>

      {/* Token status — only shown during active play */}
      {!isCompleted && (
        <div className="p-5">
          <TokenHUD tokens={tokens} />
        </div>
      )}
    </div>
  )
}
