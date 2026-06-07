import Link from 'next/link'
import { cache } from 'react'
import { getUser, getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/ui/LogoutButton'
import ShareButton from '@/components/ui/ShareButton'
import UnreadDMsBadge from '@/components/ui/UnreadDMsBadge'
import { PlayDot, VsDot, ChatDot } from '@/components/ui/NavActivityDots'
import VsNotifier from '@/components/vs/VsNotifier'
import DMNotifier from '@/components/ui/DMNotifier'
import MobileNav from '@/components/ui/MobileNav'
import { flagUrl } from '@/lib/flagEmoji'

const getPendingCount = cache(async (userId: string) => {
  const supabase = createClient()
  const { count } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('addressee_id', userId)
    .eq('status', 'pending')
  return count ?? 0
})

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
    const [profileData, count] = await Promise.all([
      getProfile(user.id),
      getPendingCount(user.id),
    ])
    profile      = profileData
    pendingCount = count
  }

  const avatar = profile?.equipped_avatar ?? '🌍'
  const border = profile?.equipped_border ?? 'none'
  const ring = BORDER_RING[border] ?? ''

  return (
    <>
    {user && <VsNotifier myId={user.id} />}
    {user && <DMNotifier myId={user.id} />}
    <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
      {/* Left — logo */}
      <Link href="/dashboard" className="font-head font-bold text-gold tracking-widest text-base hover:text-gold-dim transition-colors whitespace-nowrap">
        ≡ WORLD CHASE
      </Link>

      {/* Centre — links */}
      <div className="hidden sm:flex items-center gap-6 ml-10">
        <ShareButton className="text-xs font-head font-bold tracking-widest text-electric hover:text-white transition-colors" />
        <Link href="/play"        className="relative text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors">PLAY{user && <PlayDot userId={user.id} />}</Link>
        <Link href="/quiz"          className="text-xs font-head font-bold tracking-widest text-electric hover:text-white transition-colors">GEO QUIZ</Link>
        <Link href="/vs"           className="relative text-xs font-head font-bold tracking-widest text-gold hover:text-white transition-colors">VS DUEL{user && <VsDot userId={user.id} />}</Link>
        <Link href="/leaderboard"  className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors">LEADERBOARD</Link>
        <Link href="/daily"       className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors">DAILY</Link>
        <Link href="/archive"     className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors">ARCHIVE</Link>
        <Link href="/hall-of-fame" className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors">HALL OF FAME</Link>
        <Link href="/shop"        className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors">SHOP</Link>
        <Link href="/chat"        className="relative text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors">CHAT{user && <ChatDot userId={user.id} />}</Link>
        <Link href="/friends"     className="relative text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors">
          FRIENDS
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-3 bg-electric text-navy font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          {user && <UnreadDMsBadge myId={user.id} />}
        </Link>
        <Link href="/how-to-play" className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors">HOW TO PLAY</Link>
        <Link href="/support"     className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors">SUPPORT</Link>
        {profile?.is_admin && (
          <Link href="/admin" className="text-xs font-head font-bold tracking-widest text-danger hover:text-danger/70 transition-colors">ADMIN</Link>
        )}
      </div>

      {/* Right — tokens + avatar + hamburger */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Link href="/tokens" className="flex items-center gap-1 font-mono font-bold text-gold text-sm hover:text-gold-dim transition-colors shrink-0 py-3 px-2">
          <span>🪙</span>
          <span>{profile?.tokens ?? 0}</span>
        </Link>
        {profile?.country_code && flagUrl(profile.country_code) && (
          <img
            src={flagUrl(profile.country_code)}
            alt={profile.country_code}
            title={profile.country_code}
            width={20} height={15}
            className="rounded-sm shadow-sm shrink-0 hidden xs:block sm:block"
          />
        )}
        <Link href="/profile" className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-navy flex items-center justify-center text-lg sm:text-xl shadow-lg overflow-hidden ${ring} transition-all hover:scale-105 block shrink-0`} title="Profile">
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
        {/* Mobile hamburger — replaces inline links */}
        <MobileNav pendingCount={pendingCount} isAdmin={!!profile?.is_admin} hasUser={!!user} myId={user?.id} />
      </div>
    </nav>
    </>
  )
}
