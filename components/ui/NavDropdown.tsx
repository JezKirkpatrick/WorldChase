'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

export default function NavDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-8 h-8 text-text-muted hover:text-white transition-colors rounded"
        aria-label="More options"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="2" cy="8" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="14" cy="8" r="1.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-navy-light border border-white/15 shadow-2xl z-50 py-1">
          <Link
            href="/support"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-xs font-head font-bold tracking-widest text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            SUPPORT
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-xs font-head font-bold tracking-widest text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            SETTINGS
          </Link>
          <div className="border-t border-white/10 mt-1 pt-1">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  )
}
