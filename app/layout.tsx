import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'World Chase — Hunt the World',
  description: "The world's most challenging monthly geography game. Solve cryptic riddles. Explore Google Maps. Race to the global leaderboard.",
  openGraph: {
    title: 'World Chase — Hunt the World',
    description: 'Hunt the World. Claim the Crown. Monthly competitive geography battle.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
