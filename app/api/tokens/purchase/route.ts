import { NextRequest, NextResponse } from 'next/server'
import { stripe, TOKEN_PACKAGES } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { packageId } = await req.json()
    const pkg = TOKEN_PACKAGES.find(p => p.id === packageId)
    if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price: pkg.stripe_price_id,
        quantity: 1,
      }],
      metadata: { userId: user.id, packageId: pkg.id, tokens: String(pkg.tokens) },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/tokens?success=1&tokens=${pkg.tokens}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/tokens?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
