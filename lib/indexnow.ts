const KEY = 'a7f3c9b2e1d4f8a6'
const BASE = 'https://www.worldchase.net'

export const PUBLIC_URLS = [
  BASE,
  `${BASE}/leaderboard`,
  `${BASE}/how-to-play`,
  `${BASE}/daily`,
  `${BASE}/quiz`,
  `${BASE}/hall-of-fame`,
  `${BASE}/archive`,
  `${BASE}/shop`,
  `${BASE}/support`,
]

export async function pingIndexNow(urls: string[] = PUBLIC_URLS) {
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'www.worldchase.net',
        key: KEY,
        keyLocation: `${BASE}/${KEY}.txt`,
        urlList: urls,
      }),
    })
  } catch {
    // non-critical
  }
}
