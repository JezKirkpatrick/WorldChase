import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import { ToastProvider } from '@/components/ui/Toast'
import OnlineUsersProvider from '@/components/ui/OnlineUsersProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.worldchase.net'),
  title: 'World Chase — Hunt the World',
  description: "The world's most challenging monthly geography game. Solve cryptic riddles. Explore Google Maps. Race to the global leaderboard.",
  applicationName: 'World Chase',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'World Chase',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'World Chase — Hunt the World',
    description: 'Hunt the World. Claim the Crown. Monthly competitive geography battle.',
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
    description: 'Hunt the World. Claim the Crown. Monthly competitive geography battle.',
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
      </head>
      <body>
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
