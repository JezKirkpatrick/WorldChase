import Stripe from 'stripe'
import type { TokenPackage } from '@/types/user'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 5,
    price_nzd: 299,
    stripe_price_id: process.env.STRIPE_PRICE_STARTER ?? 'price_starter',
    badge: null,
    description: 'Just enough to get unstuck',
  },
  {
    id: 'explorer',
    name: 'Explorer Pack',
    tokens: 15,
    price_nzd: 799,
    stripe_price_id: process.env.STRIPE_PRICE_EXPLORER ?? 'price_explorer',
    badge: 'BEST START',
    description: 'For serious hunters',
  },
  {
    id: 'champion',
    name: 'Champion Pack',
    tokens: 40,
    price_nzd: 1799,
    stripe_price_id: process.env.STRIPE_PRICE_CHAMPION ?? 'price_champion',
    badge: 'MOST POPULAR',
    description: 'Compete at the top',
    highlighted: true,
  },
  {
    id: 'elite',
    name: 'Elite Pack',
    tokens: 100,
    price_nzd: 3999,
    stripe_price_id: process.env.STRIPE_PRICE_ELITE ?? 'price_elite',
    badge: 'BEST VALUE',
    description: 'For the obsessed',
  },
]
