import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()
  const { data: profile } = await sb.from('profiles').select('is_subscriber, stripe_customer_id').eq('id', user.id).maybeSingle()

  if (profile?.is_subscriber) return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_HUNTER_PASS!, quantity: 1 }],
    metadata: { userId: user.id },
    customer_email: user.email ?? undefined,
    ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : {}),
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tokens?hunter_pass=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tokens`,
  })

  return NextResponse.json({ url: session.url })
}
