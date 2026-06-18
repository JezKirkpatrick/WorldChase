import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'World Chase',
              url: 'https://www.worldchase.net',
              logo: 'https://www.worldchase.net/icon.png',
              sameAs: ['https://www.kidsworldchase.net'],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'World Chase',
              url: 'https://www.worldchase.net',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'World Chase',
              applicationCategory: 'GameApplication',
              applicationSubCategory: 'Geography Game',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript',
              url: 'https://www.worldchase.net',
              description: "The world's most challenging weekly geography game. Solve cryptic riddles, explore Google Maps, and race to the global leaderboard.",
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
              publisher: { '@type': 'Organization', name: 'World Chase', url: 'https://www.worldchase.net' },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'VideoGame',
              name: 'World Chase',
              description: "The world's most challenging weekly geography game. Solve cryptic riddles, explore Google Maps, and race to the global leaderboard.",
              url: 'https://www.worldchase.net',
              genre: ['Geography', 'Puzzle', 'Quiz', 'Strategy'],
              gamePlatform: 'Web Browser',
              operatingSystem: 'Any',
              applicationCategory: 'Game',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
              publisher: { '@type': 'Organization', name: 'World Chase', url: 'https://www.worldchase.net' },
            },
          ]) }}
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
        <footer className="border-t border-white/8 bg-navy">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
              <div>
                <div className="font-head font-bold text-xs text-text-muted tracking-widest mb-3">PLAY</div>
                <ul className="space-y-2">
                  <li><Link href="/leaderboard" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Leaderboard</Link></li>
                  <li><Link href="/how-to-play" className="font-head text-xs text-text-muted hover:text-gold transition-colors">How to Play</Link></li>
                  <li><Link href="/daily" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Daily Flag Puzzle</Link></li>
                  <li><Link href="/quiz" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Quiz</Link></li>
                </ul>
              </div>
              <div>
                <div className="font-head font-bold text-xs text-text-muted tracking-widest mb-3">EXPLORE</div>
                <ul className="space-y-2">
                  <li><Link href="/hall-of-fame" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Hall of Fame</Link></li>
                  <li><Link href="/archive" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Archive</Link></li>
                  <li><Link href="/shop" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Shop</Link></li>
                </ul>
              </div>
              <div>
                <div className="font-head font-bold text-xs text-text-muted tracking-widest mb-3">INFO</div>
                <ul className="space-y-2">
                  <li><Link href="/support" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Support</Link></li>
                  <li><Link href="/privacy" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="font-head text-xs text-text-muted hover:text-gold transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
              <div>
                <div className="font-head font-bold text-xs text-text-muted tracking-widest mb-3">SISTER SITE</div>
                <a href="https://www.kidsworldchase.net" className="font-head text-xs text-electric hover:text-white transition-colors">Kids World Chase ↗</a>
                <p className="font-head text-xs text-text-muted mt-1 leading-relaxed">Free geography game for ages 8–13</p>
              </div>
            </div>
            <div className="border-t border-white/8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-head font-bold text-gold text-sm tracking-widest">WORLD CHASE</span>
              <span className="font-head text-xs text-text-muted">© {new Date().getFullYear()} World Chase — Free Online Geography Game</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
