import Link from 'next/link'
import { getUser, getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/ui/LogoutButton'
import ShareButton from '@/components/ui/ShareButton'
import { flagEmoji } from '@/lib/flagEmoji'

const BORDER_RING: Record<string, string> = {
  gold:      'ring-2 ring-gold shadow-gold/40',
  electric:  'ring-2 ring-electric shadow-electric/40',
  diamond:   'ring-2 ring-white shadow-white/30',
  legendary: 'ring-2 ring-purple-400 shadow-purple-400/40',
  none:      '',
  default:   '',
}

export default async function GlobalNav() {
  const user = await getUser()

  // Run profile + pending-friends count in parallel — previously sequential
  let profile = null
  let pendingCount = 0
  if (user) {
    const supabase = createClient()
    const [profileData, { count }] = await Promise.all([
      getProfile(user.id),
      supabase.from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', user.id)
        .eq('status', 'pending'),
    ])
    profile      = profileData
    pendingCount = count ?? 0
  }

  const avatar = profile?.equipped_avatar ?? '🌍'
  const border = profile?.equipped_border ?? 'none'
  const ring = BORDER_RING[border] ?? ''

  return (
    <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
      {/* Left — logo */}
      <Link href="/dashboard" className="font-head font-bold text-gold tracking-widest text-base hover:text-gold-dim transition-colors whitespace-nowrap">
        ≡ WORLD CHASE
      </Link>

      {/* Centre — links */}
      <div className="hidden sm:flex items-center gap-6">
        <ShareButton className="text-xs font-head font-bold tracking-widest text-electric hover:text-white transition-colors" />
        <Link href="/play"        className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors">PLAY</Link>
        <Link href="/vs"           className="text-xs font-head font-bold tracking-widest text-gold hover:text-white transition-colors">VS DUEL</Link>
        <Link href="/leaderboard"  className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors">LEADERBOARD</Link>
        <Link href="/hall-of-fame" className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors">HALL OF FAME</Link>
        <Link href="/shop"        className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors">SHOP</Link>
        <Link href="/chat"        className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors">CHAT</Link>
        <Link href="/friends"     className="relative text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors">
          FRIENDS
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-3 bg-electric text-navy font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Link>
        <Link href="/how-to-play" className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors">HOW TO PLAY</Link>
        <Link href="/support"     className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors">SUPPORT</Link>
        {profile?.is_admin && (
          <Link href="/admin" className="text-xs font-head font-bold tracking-widest text-danger hover:text-danger/70 transition-colors">ADMIN</Link>
        )}
      </div>

      {/* Right — tokens + avatar */}
      <div className="flex items-center gap-3">
        <Link href="/tokens" className="flex items-center gap-1.5 font-mono font-bold text-gold text-sm hover:text-gold-dim transition-colors">
          <span>🪙</span>
          <span>{profile?.tokens ?? 0}</span>
        </Link>
        {profile?.country_code && (
          <span className="text-xl leading-none" title={profile.country_code}>
            {flagEmoji(profile.country_code)}
          </span>
        )}
        <Link href="/profile" className={`w-9 h-9 rounded-full bg-navy flex items-center justify-center text-xl shadow-lg overflow-hidden ${ring} transition-all hover:scale-105 block shrink-0`} title="Profile">
          {avatar.startsWith('http')
            ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            : avatar}
        </Link>
        <div className="hidden sm:flex items-center gap-2">
          <Link href="/settings" className="text-xl text-text-muted hover:text-white transition-colors px-2 py-1" title="Account settings">
            ⚙
          </Link>
          <LogoutButton />
        </div>
        {/* Mobile links */}
        <div className="sm:hidden flex items-center gap-3">
          <Link href="/play"        className="text-xs font-head text-text-muted hover:text-white">PLAY</Link>
          <Link href="/vs"          className="text-xs font-head text-gold hover:text-white">VS</Link>
          <Link href="/leaderboard" className="text-xs font-head text-text-muted hover:text-white">LB</Link>
          <Link href="/shop"        className="text-xs font-head text-gold">SHOP</Link>
          <Link href="/chat"    className="text-xs font-head text-electric hover:text-white">CHAT</Link>
          <Link href="/friends" className="relative text-xs font-head text-text-muted hover:text-white">
            👥{pendingCount > 0 && <span className="absolute -top-1 -right-1.5 bg-electric text-navy font-mono text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{pendingCount}</span>}
          </Link>
          <LogoutButton />
        </div>
      </div>
    </nav>
  )
}
