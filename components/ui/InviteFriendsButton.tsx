'use client'

const FB_APP_ID = '1613984633019651'

export default function InviteFriendsButton({ className }: { className?: string }) {
  async function handleClick() {
    const gameUrl = window.location.origin
    const text = 'Come play WorldChase with me! 🌍 Race to name locations around the globe.'

    // Mobile: native share sheet lets user pick Messenger, WhatsApp, SMS, etc.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'WorldChase', text, url: gameUrl })
        return
      } catch {
        // User cancelled or browser blocked — fall through to Messenger dialog
      }
    }

    // Desktop: Facebook Send Dialog (opens pre-filled Messenger share)
    const encoded = encodeURIComponent(gameUrl)
    window.open(
      `https://www.facebook.com/dialog/send?app_id=${FB_APP_ID}&link=${encoded}&redirect_uri=${encoded}`,
      'fb-messenger-send',
      'width=600,height=500,resizable=yes'
    )
  }

  return (
    <button onClick={handleClick} className={className}>
      💬 INVITE FRIENDS
    </button>
  )
}
