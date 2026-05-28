'use client'

export default function InviteFriendsButton({ className }: { className?: string }) {
  async function handleClick() {
    const gameUrl = window.location.origin
    const text = 'Come play WorldChase with me! 🌍 Race to name locations around the globe.'

    // Native share sheet (mobile) — lets user pick Messenger, WhatsApp, SMS, etc.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'WorldChase', text, url: gameUrl })
        return
      } catch {
        // User cancelled or share failed — fall through
      }
    }

    // Fallback: Messenger deep link (opens Messenger app on mobile, Messenger web on desktop)
    const encoded = encodeURIComponent(gameUrl)
    window.open(
      `fb-messenger://share/?link=${encoded}`,
      '_blank'
    )
    // Give the deep link 500ms to fire, then open Messenger web as safety net
    setTimeout(() => {
      window.open(`https://www.messenger.com`, '_blank')
    }, 500)
  }

  return (
    <button onClick={handleClick} className={className}>
      💬 INVITE FRIENDS
    </button>
  )
}
