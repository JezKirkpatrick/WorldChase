/** Returns a flag image URL for the given ISO 3166-1 alpha-2 country code. */
export function flagUrl(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''
  return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`
}

/** Legacy emoji fallback — kept for any callers not yet migrated to flagUrl. */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}
