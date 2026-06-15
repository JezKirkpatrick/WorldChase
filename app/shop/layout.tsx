import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Customise your World Chase profile with avatars, borders, and titles. Earn tokens by playing or buy token packs to unlock rare and legendary cosmetics.',
  keywords: ['world chase shop', 'geography game cosmetics', 'game avatars', 'profile customisation', 'game tokens'],
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}
