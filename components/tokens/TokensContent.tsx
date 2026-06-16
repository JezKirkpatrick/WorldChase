'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { TOKEN_PACKAGES } from '@/lib/stripe'

// Map browser locale region → ISO currency code
const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', AT: 'EUR', BE: 'EUR', PT: 'EUR', IE: 'EUR', FI: 'EUR',
  JP: 'JPY', SG: 'SGD', HK: 'HKD', IN: 'INR', KR: 'KRW',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  ZA: 'ZAR', BR: 'BRL', MX: 'MXN', CN: 'CNY',
}

function detectCurrency(): string {
  try {
    const locale = navigator.language || 'en-NZ'
    const region = new Intl.Locale(locale).region ?? ''
    return REGION_CURRENCY[region] ?? 'NZD'
  } catch {
    return 'NZD'
  }
}

export default function TokensContent() {
  const [tokens,       setTokens]      = useState(0)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [loading,      setLoading]     = useState<string | null>(null)
  const [currency,     setCurrency]    = useState('NZD')
  const [rate,         setRate]        = useState(1)
  const [rateReady,    setRateReady]   = useState(false)
  const searchParams = useSearchParams()
  const success      = searchParams.get('success')
  const cancelled    = searchParams.get('cancelled')
  const hunterPass   = searchParams.get('hunter_pass')
  const supabase     = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('tokens, is_subscriber').eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setTokens(data.tokens ?? 0)
            setIsSubscriber(data.is_subscriber ?? false)
          }
        })
    })

    const cur = detectCurrency()
    setCurrency(cur)
    if (cur === 'NZD') { setRate(1); setRateReady(true); return }
    fetch('https://open.er-api.com/v6/latest/NZD')
      .then(r => r.json())
      .then(d => { setRate(d.rates?.[cur] ?? 1); setRateReady(true) })
      .catch(() => { setRate(1); setCurrency('NZD'); setRateReady(true) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function displayPrice(priceNzd: number) {
    const amount = (priceNzd / 100) * rate
    return new Intl.NumberFormat(navigator.language, { style: 'currency', currency }).format(amount)
  }

  async function handlePurchase(packageId: string) {
    setLoading(packageId)
    const res = await fetch('/api/tokens/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  async function handleSubscribe() {
    setLoading('hunter_pass')
    const res = await fetch('/api/stripe/subscribe', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  async function handlePortal() {
    setLoading('portal')
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {success && (
        <div className="mb-6 border border-success/40 bg-success/10 p-4 text-success font-head text-center">
          🪙 {searchParams.get('tokens')} TOKENS DEPLOYED TO YOUR ACCOUNT. HUNT WELL.
        </div>
      )}
      {hunterPass === 'success' && (
        <div className="mb-6 border border-gold/60 bg-gold/10 p-4 text-gold font-head text-center">
          🎖 HUNTER PASS ACTIVATED — 15 tokens drop every Monday. Welcome to the pack.
        </div>
      )}
      {cancelled && (
        <div className="mb-6 border border-warning/40 bg-warning/10 p-4 text-warning font-head text-center">
          PAYMENT CANCELLED — No tokens charged.
        </div>
      )}

      <div className="text-center mb-10">
        <div className="text-xs text-gold font-head tracking-[0.3em] mb-2">TOKEN STORE</div>
        <h1 className="font-head font-bold text-3xl text-white mb-2">RESUPPLY YOUR ARSENAL</h1>
        <p className="text-text-muted font-head">Tokens unlock intelligence. Intelligence wins races.</p>
        {tokens > 0 && (
          <div className="mt-3 font-mono text-gold font-bold text-lg">🪙 {tokens} tokens in reserve</div>
        )}
      </div>

      {/* ── HUNTER PASS ── */}
      <div className="mb-8 relative border-2 border-gold bg-gold/5 p-6 sm:p-8"
        style={{ boxShadow: '0 0 32px rgba(245,197,24,0.15)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="text-xs font-head tracking-[0.3em] text-gold/70 mb-1">BEST VALUE</div>
            <h2 className="font-head font-bold text-2xl sm:text-3xl text-gold mb-2">🎖 HUNTER PASS</h2>
            <p className="text-text-muted font-head text-sm leading-relaxed mb-3">
              The smartest way to stock up. Subscribe once and get{' '}
              <span className="text-white font-bold">15 tokens dropped into your account every Monday</span> — automatically, forever, while your pass is active.
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-head">
              <span className="border border-gold/30 px-2.5 py-1 text-gold">✓ 15 tokens / week</span>
              <span className="border border-gold/30 px-2.5 py-1 text-gold">✓ 60 tokens / month</span>
              <span className="border border-gold/30 px-2.5 py-1 text-gold">✓ Cancel anytime</span>
              <span className="border border-gold/30 px-2.5 py-1 text-gold">✓ No contract</span>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <div className="font-mono text-4xl font-bold text-gold mb-0.5">$3</div>
            <div className="text-text-muted font-head text-sm mb-4">per week · billed weekly</div>
            {isSubscriber ? (
              <div className="space-y-2">
                <div className="px-6 py-2 border border-success/40 text-success font-head font-bold text-sm text-center">
                  ✓ ACTIVE SUBSCRIBER
                </div>
                <button
                  onClick={handlePortal}
                  disabled={loading === 'portal'}
                  className="w-full py-2 border border-white/20 text-text-muted font-head text-xs tracking-widest hover:border-white/40 transition-colors disabled:opacity-50"
                >
                  {loading === 'portal' ? 'REDIRECTING...' : 'MANAGE / CANCEL →'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={loading === 'hunter_pass'}
                className="px-8 py-3.5 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all disabled:opacity-50"
                style={{ boxShadow: '0 0 20px rgba(245,197,24,0.3)' }}
              >
                {loading === 'hunter_pass' ? 'REDIRECTING...' : 'ACTIVATE HUNTER PASS →'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-text-muted font-head text-center mb-6 tracking-widest">— OR BUY TOKENS ONE-TIME —</div>

      <div className="grid sm:grid-cols-2 gap-4">
        {TOKEN_PACKAGES.map(pkg => (
          <div key={pkg.id} className={`border p-6 bracket-box relative ${pkg.highlighted ? 'border-gold/50 bg-gold/5' : 'border-white/10'}`}>
            {pkg.badge && (
              <div className="absolute top-3 right-3 text-xs font-head font-bold tracking-wider px-2 py-0.5 bg-gold text-navy">
                {pkg.badge}
              </div>
            )}
            <div className="font-head font-bold text-white text-lg mb-1">{pkg.name}</div>
            <div className="font-mono text-gold text-3xl font-bold mb-1">🪙 {pkg.tokens}</div>
            <div className="text-text-muted font-head text-sm mb-1">{pkg.description}</div>
            <div className="text-text-muted font-mono text-xs mb-5">
              {rateReady ? displayPrice(pkg.price_nzd) : `$${(pkg.price_nzd / 100).toFixed(2)} NZD`}
            </div>
            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading === pkg.id}
              className={`w-full py-3 font-head font-bold text-sm tracking-widest transition-colors disabled:opacity-50 ${
                pkg.highlighted
                  ? 'bg-gold text-navy hover:bg-gold-dim'
                  : 'border border-gold/40 text-gold hover:bg-gold/10'
              }`}
            >
              {loading === pkg.id ? 'REDIRECTING...' : `GET ${pkg.tokens} TOKENS`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-xs text-text-muted font-head space-y-1">
        <div>Secure payment via Stripe · Tokens credited instantly · Hunter Pass billed weekly</div>
        {currency !== 'NZD' && rateReady && (
          <div className="text-white/20">Prices shown in {currency} · exact rate applied by Stripe at checkout</div>
        )}
      </div>
    </div>
  )
}
