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
  const [tokens,   setTokens]   = useState(0)
  const [loading,  setLoading]  = useState<string | null>(null)
  const [currency, setCurrency] = useState('NZD')
  const [rate,     setRate]     = useState(1)       // NZD → user currency
  const [rateReady, setRateReady] = useState(false)
  const searchParams = useSearchParams()
  const success   = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')
  const supabase  = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('tokens').eq('id', user.id).maybeSingle()
        .then(({ data }) => data && setTokens(data.tokens ?? 0))
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {success && (
        <div className="mb-6 border border-success/40 bg-success/10 p-4 text-success font-head text-center">
          🪙 {searchParams.get('tokens')} TOKENS DEPLOYED TO YOUR ACCOUNT. HUNT WELL.
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
        <div>Secure payment via Stripe · Tokens credited instantly · No subscription</div>
        {currency !== 'NZD' && rateReady && (
          <div className="text-white/20">Prices shown in {currency} · exact rate applied by Stripe at checkout</div>
        )}
      </div>
    </div>
  )
}
