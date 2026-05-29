const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUUID(s: string | null | undefined): boolean {
  return !!s && UUID_RE.test(s)
}

/** Safe display name: prefers display_name, falls back to username (if not UUID), else 'Hunter' */
export function safeDisplayName(profile: {
  display_name?: string | null
  username?: string | null
} | null | undefined): string {
  if (!profile) return 'Hunter'
  if (profile.display_name) return profile.display_name
  if (profile.username && !isUUID(profile.username)) return profile.username
  return 'Hunter'
}

/** Safe @handle: returns username if valid, else 'new-player' */
export function safeHandle(profile: {
  username?: string | null
} | null | undefined): string {
  if (!profile?.username || isUUID(profile.username)) return 'new-player'
  return profile.username
}
