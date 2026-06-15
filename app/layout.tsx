import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import { ToastProvider } from '@/components/ui/Toast'
import OnlineUsersProvider from '@/components/ui/OnlineUsersProvider'
import NextTopLoader from 'nextjs-toploader'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.worldchase.net'),
  title: {
    default: 'World Chase — Hunt the World',
    template: '%s | World Chase',
  },
  description: "The world's most challenging weekly geography game. Solve cryptic riddles, explore Google Maps, and race to the global leaderboard. Free to play.",
  keywords: [
    'geography game', 'world geography game', 'online geography quiz', 'country guessing game',
    'location puzzle game', 'geography riddles', 'competitive geography game', 'weekly geography challenge',
    'global leaderboard game', 'geography puzzle online', 'map game', 'country quiz game',
    'geoguessr alternative', 'world map quiz', 'geography trivia game',
  ],
  applicationName: 'World Chase',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'World Chase',
  },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: 'World Chase — Hunt the World',
    description: 'Hunt the World. Claim the Crown. Weekly competitive geography battle.',
    type: 'website',
    url: 'https://www.worldchase.net',
    siteName: 'World Chase',
    images: [{
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'World Chase — Hunt the World',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'World Chase — Hunt the World',
    description: 'Hunt the World. Claim the Crown. Weekly competitive geography battle.',
    images: ['/opengraph-image'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0B1628',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'VideoGame',
            name: 'World Chase',
            description: "The world's most challenging weekly geography game. Solve cryptic riddles, explore Google Maps, and race to the global leaderboard.",
            url: 'https://www.worldchase.net',
            genre: ['Geography', 'Puzzle', 'Quiz', 'Strategy'],
            gamePlatform: 'Web Browser',
            operatingSystem: 'Any',
            applicationCategory: 'Game',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'NZD', availability: 'https://schema.org/InStock' },
            publisher: { '@type': 'Organization', name: 'World Chase', url: 'https://www.worldchase.net' },
          }) }}
        />
      </head>
      <body>
        <NextTopLoader color="#F5C518" height={3} showSpinner={false} />
        <OnlineUsersProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
          <ServiceWorkerRegister />
          <InstallPrompt />
        </OnlineUsersProvider>
      </body>
    </html>
  )
}
