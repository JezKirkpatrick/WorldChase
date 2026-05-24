import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.worldchase.net'
  return [
    { url: base,                    lastModified: new Date(), changeFrequency: 'monthly',  priority: 1 },
    { url: `${base}/dashboard`,     lastModified: new Date(), changeFrequency: 'daily',    priority: 0.9 },
    { url: `${base}/play`,          lastModified: new Date(), changeFrequency: 'daily',    priority: 0.9 },
    { url: `${base}/leaderboard`,   lastModified: new Date(), changeFrequency: 'hourly',   priority: 0.8 },
    { url: `${base}/shop`,          lastModified: new Date(), changeFrequency: 'weekly',   priority: 0.7 },
    { url: `${base}/profile`,       lastModified: new Date(), changeFrequency: 'weekly',   priority: 0.6 },
    { url: `${base}/how-to-play`,   lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.5 },
    { url: `${base}/tokens`,        lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.5 },
  ]
}
