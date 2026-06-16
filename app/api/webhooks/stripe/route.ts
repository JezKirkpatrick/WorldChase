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

  const supabase = createServiceClient()

  // ── One-time token purchase ──────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, tokens } = session.metadata ?? {}

    if (session.mode === 'subscription') {
      // Hunter Pass subscription started
      if (!userId) return NextResponse.json({ received: true })
      await supabase.from('profiles').update({
        is_subscriber: true,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }).eq('id', userId)
      return NextResponse.json({ received: true })
    }

    // One-time purchase
    if (!userId || !tokens) return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    const paymentIntentId = session.payment_intent as string

    const { data: existing } = await supabase
      .from('token_transactions').select('id')
      .eq('stripe_payment_id', paymentIntentId).maybeSingle()
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

  // ── Subscription cancelled / expired ────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase.from('profiles').update({
      is_subscriber: false,
      stripe_subscription_id: null,
    }).eq('stripe_customer_id', sub.customer as string)
  }

  // ── Subscription payment failed (pause access) ──────────────────────
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const active = sub.status === 'active' || sub.status === 'trialing'
    await supabase.from('profiles').update({ is_subscriber: active })
      .eq('stripe_customer_id', sub.customer as string)
  }

  return NextResponse.json({ received: true })
}
