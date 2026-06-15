import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.worldchase.net'
  return [
    { url: base,                        lastModified: new Date(), changeFrequency: 'weekly',   priority: 1.0 },
    { url: `${base}/leaderboard`,       lastModified: new Date(), changeFrequency: 'hourly',   priority: 0.9 },
    { url: `${base}/how-to-play`,       lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.8 },
    { url: `${base}/daily`,             lastModified: new Date(), changeFrequency: 'daily',    priority: 0.8 },
    { url: `${base}/hall-of-fame`,      lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.7 },
    { url: `${base}/archive`,           lastModified: new Date(), changeFrequency: 'weekly',   priority: 0.7 },
    { url: `${base}/shop`,              lastModified: new Date(), changeFrequency: 'weekly',   priority: 0.6 },
  ]
}
