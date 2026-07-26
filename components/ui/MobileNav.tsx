'use client'
import { useState } from 'react'
import Link from 'next/link'
import LogoutButton from './LogoutButton'
import UnreadDMsBadge from './UnreadDMsBadge'
import { PlayDot, VsDot, ChatDot } from './NavActivityDots'

interface Props {
  pendingCount: number
  isAdmin: boolean
  hasUser: boolean
  myId?: string
}


export default function MobileNav({ pendingCount, isAdmin, hasUser, myId }: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="sm:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-12 h-12 text-white font-head font-bold text-lg"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? '✕' : '☰'}
        {pendingCount > 0 && !open && (
          <span className="absolute top-1 right-0.5 bg-electric text-navy font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={close}
          />

          {/* Drawer */}
          <div className="fixed top-14 left-0 right-0 z-50 bg-navy-light border-b border-white/10 shadow-2xl overflow-y-auto"
            style={{ maxHeight: 'calc(100dvh - 3.5rem)' }}>
            <div className="grid grid-cols-2 border-t border-white/5">

              <Link href="/play" onClick={close}
                className="relative px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-white flex items-center gap-1.5">
                PLAY {myId && <PlayDot userId={myId} inline />}
              </Link>

              <Link href="/quiz" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-electric whitespace-nowrap overflow-hidden">
                GEO QUIZ
              </Link>

              <Link href="/vs" onClick={close}
                className="relative px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-gold flex items-center gap-1.5">
                VS DUEL {myId && <VsDot userId={myId} inline />}
              </Link>

<Link href="/daily" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                DAILY
              </Link>

              <Link href="/leaderboard" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                LEADERBOARD
              </Link>

              <Link href="/archive" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                ARCHIVE
              </Link>

              <Link href="/hall-of-fame" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                HALL OF FAME
              </Link>

              <Link href="/shop" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                SHOP
              </Link>

              <Link href="/chat" onClick={close}
                className="relative px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted flex items-center gap-1.5">
                CHAT {myId && <ChatDot userId={myId} inline />}
              </Link>

              <Link href="/how-to-play" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                HOW TO PLAY
              </Link>

              <Link href="/support" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                SUPPORT
              </Link>

              <Link href="/settings" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                SETTINGS
              </Link>

              <Link href="/dashboard" onClick={close}
                className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted whitespace-nowrap overflow-hidden">
                DASHBOARD
              </Link>

              <Link
                href="/friends"
                onClick={close}
                className="relative px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-text-muted flex items-center gap-2"
              >
                FRIENDS
                {pendingCount > 0 && (
                  <span className="bg-electric text-navy font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {pendingCount}
                  </span>
                )}
                {myId && <UnreadDMsBadge myId={myId} />}
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={close}
                  className="px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-danger"
                >
                  ADMIN
                </Link>
              )}
              <a
                href="https://kidsworldchase.net"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="col-span-2 px-4 py-4 font-head font-bold text-sm tracking-widest border-b border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors text-green-400 text-center"
              >
                ↗ KIDS WORLD CHASE
              </a>
            </div>

            {hasUser && (
              <div className="p-4 border-t border-white/10 pb-safe">
                <LogoutButton />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
