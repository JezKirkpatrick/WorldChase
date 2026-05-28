'use client'
import { useState } from 'react'

export default function InviteFriendsButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    const gameUrl = window.location.origin
    const encoded = encodeURIComponent(gameUrl)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isMobile) {
      // Try native share sheet first (lets user pick Messenger, WhatsApp, SMS, etc.)
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'WorldChase',
            text: 'Come play WorldChase with me! 🌍 Race to name locations around the globe.',
            url: gameUrl,
          })
          return
        } catch { /* cancelled — fall through */ }
      }
      // Fallback: open Messenger app directly
      window.location.href = `fb-messenger://share/?link=${encoded}`
      return
    }

    // Desktop: copy link to clipboard
    try {
      await navigator.clipboard.writeText(gameUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy this link and paste it in Messenger:', gameUrl)
    }
  }

  return (
    <button onClick={handleClick} className={className}>
      {copied ? '✓ LINK COPIED!' : '💬 INVITE FRIENDS'}
    </button>
  )
}
