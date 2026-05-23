export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  country: string | null
  country_code: string | null
  tokens: number
  total_score_alltime: number
  is_admin: boolean
  is_banned: boolean
  daily_login_streak: number
  last_login_date: string | null
  keyboard_controls: boolean
  sound_enabled: boolean
  created_at: string
  updated_at: string
}

export interface TokenPackage {
  id: string
  name: string
  tokens: number
  price_nzd: number
  stripe_price_id: string
  badge: string | null
  description: string
  highlighted?: boolean
}
