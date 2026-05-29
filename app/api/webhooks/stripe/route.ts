import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, tokens } = session.metadata ?? {}
    if (!userId || !tokens) return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })

    const supabase = createServiceClient()
    const paymentIntentId = session.payment_intent as string

    // Idempotency guard: Stripe delivers webhooks at-least-once; skip if already processed
    const { data: existing } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('stripe_payment_id', paymentIntentId)
      .maybeSingle()

    if (existing) return NextResponse.json({ received: true })

    const tokenAmount = parseInt(tokens)
    await Promise.all([
      supabase.rpc('adjust_tokens', { p_user_id: userId, p_amount: tokenAmount }),
      supabase.from('token_transactions').insert({
        user_id: userId, type: 'purchase', amount: tokenAmount,
        stripe_payment_id: paymentIntentId,
        description: `Purchased ${tokenAmount} tokens`,
      }),
    ])
  }

  return NextResponse.json({ received: true })
}
