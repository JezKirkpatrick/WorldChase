/** Convert an ISO 3166-1 alpha-2 country code to the corresponding emoji flag. */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}
