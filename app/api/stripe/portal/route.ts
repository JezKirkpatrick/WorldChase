import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()
  const { data: profile } = await sb.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'No subscription found' }, { status: 400 })

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/tokens`,
  })

  return NextResponse.json({ url: session.url })
}
