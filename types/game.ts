export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'
export type ChallengeStatus = 'locked' | 'active' | 'completed' | 'skipped' | 'failed'
export type EventStatus = 'upcoming' | 'active' | 'completed'

export interface Clue {
  order: number
  text: string
}

export interface Challenge {
  id: string
  event_id: string
  round_number: number
  difficulty: Difficulty
  location_name: string
  location_country: string
  location_lat: number
  location_lng: number
  map_start_lat: number
  map_start_lng: number
  street_view_heading: number
  street_view_pitch: number
  street_view_only: boolean
  street_view_question: string | null
  riddle_text: string
  clues: Clue[]
  answer_keywords: string[]
  fun_fact: string
  points_value: number
  time_limit_seconds: number
  created_at: string
}

export interface HiddenToken {
  id: string
  challenge_id: string
  lat: number
  lng: number
  radius_meters: number
  token_value: number
  hint_text: string
  created_at: string
}

export interface PlayerProgress {
  id: string
  user_id: string
  event_id: string
  challenge_id: string
  status: ChallengeStatus
  clues_revealed: number
  tokens_spent_on_clues: number
  attempts: number
  score_earned: number
  started_at: string | null
  completed_at: string | null
  time_taken_seconds: number | null
  hidden_tokens_found: number
  speed_bonus_earned: boolean
}

export interface MonthlyEvent {
  id: string
  name: string
  slug: string
  description: string
  month: number
  year: number
  status: EventStatus
  starts_at: string
  ends_at: string
  total_rounds: number
  prize_first: string
  prize_second: string
  prize_third: string
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  user_id: string
  event_id: string
  total_score: number
  challenges_completed: number
  challenges_skipped: number
  current_round: number
  total_tokens_found: number
  rank: number
  previous_rank: number
  last_updated: string
  profiles?: {
    username: string
    display_name: string
    avatar_url: string
    country: string
    country_code: string
  }
}

export interface Guess {
  id: string
  user_id: string
  challenge_id: string
  guess_text: string
  is_correct: boolean
  ai_feedback: string
  ai_confidence: number
  created_at: string
}

export interface TokenTransaction {
  id: string
  user_id: string
  type: 'purchase' | 'earned_round' | 'earned_login' | 'earned_hidden' | 'earned_referral' | 'spent_clue' | 'spent_skip' | 'admin_grant' | 'vs_wager' | 'vs_win' | 'vs_refund'
  amount: number
  stripe_payment_id: string | null
  challenge_id: string | null
  hidden_token_id: string | null
  description: string
  created_at: string
}

export interface ScoreCalculation {
  basePoints: number
  clueMultiplier: number
  attemptPenalty: number
  speedMultiplier: number  // 2.0 at instant → 1.0 at 5 min → 0.5 floor at 10 min+
  finalScore: number
}

export interface GameState {
  challenge: Challenge | null
  progress: PlayerProgress | null
  cluesRevealed: Clue[]
  guesses: Guess[]
  hiddenTokensFound: string[]
  timeElapsed: number
  isComplete: boolean
}
