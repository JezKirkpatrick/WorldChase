'use client'

const FB_APP_ID = '1613984633019651'

export default function InviteFriendsButton({ className }: { className?: string }) {
  async function handleClick() {
    const gameUrl = window.location.origin
    const encoded = encodeURIComponent(gameUrl)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isMobile && navigator.share) {
      // Mobile: native share sheet — user can pick Messenger, WhatsApp, SMS, etc.
      try {
        await navigator.share({
          title: 'WorldChase',
          text: 'Come play WorldChase with me! 🌍 Race to name locations around the globe.',
          url: gameUrl,
        })
        return
      } catch {
        // Cancelled or failed — fall through to Messenger dialog
      }
    }

    // Desktop (and mobile fallback): Facebook Send Dialog → opens directly in Messenger
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
