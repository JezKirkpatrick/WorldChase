import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'World Chase',
    short_name: 'WorldChase',
    description: 'Hunt the World. Claim the Crown. Weekly competitive geography battle.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0B1628',
    theme_color: '#0B1628',
    orientation: 'portrait-primary',
    categories: ['games', 'education'],
    icons: [
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
  }
}
