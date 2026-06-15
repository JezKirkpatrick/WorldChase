import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/leaderboard', '/how-to-play', '/shop', '/daily', '/archive', '/hall-of-fame'],
        disallow: ['/api/', '/admin/', '/play/', '/dashboard', '/profile', '/settings', '/tokens', '/vs/', '/auth/'],
      },
    ],
    sitemap: 'https://www.worldchase.net/sitemap.xml',
  }
}
