import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/leaderboard', '/how-to-play'],
        disallow: ['/api/', '/admin/', '/play/', '/dashboard', '/profile', '/settings', '/shop', '/tokens'],
      },
    ],
    sitemap: 'https://www.worldchase.net/sitemap.xml',
  }
}
