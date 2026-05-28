'use client'

export default function InviteFriendsButton({ className }: { className?: string }) {
  function handleClick() {
    const url = encodeURIComponent(window.location.origin)
    const quote = encodeURIComponent('Come play WorldChase with me! 🌍 Race to name locations around the globe.')
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
      'fb-invite',
      'width=600,height=500,resizable=yes'
    )
  }

  return (
    <button onClick={handleClick} className={className}>
      📘 INVITE FRIENDS
    </button>
  )
}
