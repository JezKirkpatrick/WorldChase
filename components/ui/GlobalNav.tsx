import Link from 'next/link'
import { cache } from 'react'
import { getUser, getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import UnreadDMsBadge from '@/components/ui/UnreadDMsBadge'
import NavDropdown from '@/components/ui/NavDropdown'
import { PlayDot, VsDot, ChatDot } from '@/components/ui/NavActivityDots'
import VsNotifier from '@/components/vs/VsNotifier'
import DMNotifier from '@/components/ui/DMNotifier'
import MobileNav from '@/components/ui/MobileNav'
import { flagUrl } from '@/lib/flagEmoji'
import Avatar from '@/components/ui/Avatar'

const getPendingCount = cache(async (userId: string) => {
  const supabase = createClient()
  const { count } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('addressee_id', userId)
    .eq('status', 'pending')
  return count ?? 0
})

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

  return (
    <>
    {user && <VsNotifier myId={user.id} />}
    {user && <DMNotifier myId={user.id} />}
    <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
      {/* Left — logo */}
      <Link href="/dashboard" className="font-head font-bold text-gold tracking-widest text-base hover:text-gold-dim transition-colors whitespace-nowrap">
        ≡ WC
      </Link>

      {/* Centre — links */}
      <div className="hidden sm:flex items-center gap-3 ml-4 overflow-hidden">
        <Link href="/play"        className="relative text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors whitespace-nowrap">PLAY{user && <PlayDot userId={user.id} />}</Link>
        <Link href="/quiz"        className="text-xs font-head font-bold tracking-widest text-electric hover:text-white transition-colors whitespace-nowrap">GEO QUIZ</Link>
        <Link href="/vs"          className="relative text-xs font-head font-bold tracking-widest text-gold hover:text-white transition-colors whitespace-nowrap">VS DUEL{user && <VsDot userId={user.id} />}</Link>
<Link href="/leaderboard" className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors whitespace-nowrap">LEADERBOARD</Link>
        <Link href="/daily"       className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors whitespace-nowrap">DAILY</Link>
        <Link href="/shop"        className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors whitespace-nowrap">SHOP</Link>
        <Link href="/chat"        className="relative text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors whitespace-nowrap">CHAT{user && <ChatDot userId={user.id} />}</Link>
        <Link href="/friends"     className="relative text-xs font-head font-bold tracking-widest text-text-muted hover:text-electric transition-colors whitespace-nowrap">
          FRIENDS
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-3 bg-electric text-navy font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          {user && <UnreadDMsBadge myId={user.id} />}
        </Link>
        <Link href="/archive"     className="hidden lg:inline text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors whitespace-nowrap">ARCHIVE</Link>
        <Link href="/hall-of-fame" className="hidden lg:inline text-xs font-head font-bold tracking-widest text-text-muted hover:text-gold transition-colors whitespace-nowrap">HALL OF FAME</Link>
        <Link href="/how-to-play" className="hidden lg:inline text-xs font-head font-bold tracking-widest text-text-muted hover:text-white transition-colors whitespace-nowrap">HOW TO PLAY</Link>
        <a href="https://kidsworldchase.net" target="_blank" rel="noopener noreferrer" className="hidden lg:inline text-xs font-head font-bold tracking-widest text-green-400 hover:text-white border border-green-400/40 px-2 py-0.5 rounded transition-colors whitespace-nowrap">KWC ↗</a>
        {profile?.is_admin && (
          <Link href="/admin" className="text-xs font-head font-bold tracking-widest text-danger hover:text-danger/70 transition-colors whitespace-nowrap">ADMIN</Link>
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
        <Link href="/profile" className="shrink-0 hover:scale-105 transition-transform block" title="Profile">
          <Avatar emoji={avatar} border={border} size="sm" />
        </Link>
        <NavDropdown />
        {/* Mobile hamburger — replaces inline links */}
        <MobileNav pendingCount={pendingCount} isAdmin={!!profile?.is_admin} hasUser={!!user} myId={user?.id} />
      </div>
    </nav>
    </>
  )
}
