import { getDifficultyBgColor } from '@/lib/gameLogic'
import type { Difficulty } from '@/types/game'

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-bold tracking-widest uppercase border ${getDifficultyBgColor(difficulty)}`}>
      ▲ {difficulty}
    </span>
  )
}
