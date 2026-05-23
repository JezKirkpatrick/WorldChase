'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'

const RARITY_COLOR: Record<string, string> = {
  common:    'text-text-muted border-white/20',
  rare:      'text-electric border-electric/40',
  epic:      'text-purple-400 border-purple-400/40',
  legendary: 'text-gold border-gold/60',
}

const RARITY_LABEL: Record<string, string> = {
  common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY',
}

export default function ShopPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [tokens, setTokens] = useState(0)
  const [cosmetics, setCosmetics] = useState<any[]>([])
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [equipped, setEquipped] = useState<{ avatar: string; border: string; title: string }>({ avatar: '', border: '', title: '' })
  const [activeTab, setActiveTab] = useState<'avatar' | 'border' | 'title'>('avatar')
  const [buying, setBuying] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; success: boolean; msg: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      supabase.from('profiles').select('tokens,equipped_avatar,equipped_border,equipped_title').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setTokens(data.tokens ?? 0)
            setEquipped({ avatar: data.equipped_avatar ?? 'ðŸŒ', border: data.equipped_border ?? 'none', title: data.equipped_title ?? '' })
          }
        })
      supabase.from('cosmetics').select('*').order('token_cost').then(({ data }) => setCosmetics(data ?? []))
      supabase.from('user_cosmetics').select('cosmetic_id').eq('user_id', user.id)
        .then(({ data }) => setOwned(new Set(data?.map(r => r.cosmetic_id) ?? [])))
    })
  }, [])

  async function handleBuy(cosmetic: any) {
    if (!userId || buying) return
    setBuying(cosmetic.id)
    const res = await fetch('/api/shop/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, cosmeticId: cosmetic.id }),
    })
    const data = await res.json()
    if (data.error) {
      setFlash({ id: cosmetic.id, success: false, msg: data.error })
    } else {
      setTokens(data.newTokenBalance)
      setOwned(prev => new Set([...prev, cosmetic.id]))
      setFlash({ id: cosmetic.id, success: true, msg: 'Unlocked!' })
    }
    setBuying(null)
    setTimeout(() => setFlash(null), 2000)
  }

  async function handleEquip(cosmetic: any) {
    if (!userId) return
    const field = cosmetic.type === 'avatar' ? 'equipped_avatar'
      : cosmetic.type === 'border' ? 'equipped_border'
      : 'equipped_title'
    await supabase.from('profiles').update({ [field]: cosmetic.value }).eq('id', userId)
    setEquipped(prev => ({ ...prev, [cosmetic.type]: cosmetic.value }))
    setFlash({ id: cosmetic.id, success: true, msg: 'Equipped!' })
    setTimeout(() => setFlash(null), 1500)
  }

  const filtered = cosmetics.filter(c => c.type === activeTab)
  const isEquipped = (c: any) =>
    (c.type === 'avatar' && equipped.avatar === c.value) ||
    (c.type === 'border' && equipped.border === c.value) ||
    (c.type === 'title' && equipped.title === c.value)

  return (
    <div className="min-h-screen bg-navy text-text">
      {/* Nav */}
      <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-6 sticky top-0 z-30">
        <a href="/dashboard" className="font-head font-bold text-gold tracking-widest hover:text-gold-dim transition-colors">â‰¡ WORLD CHASE</a>
        <div className="flex items-center gap-4">
          <a href="/leaderboard" className="text-xs font-head text-text-muted hover:text-white">LEADERBOARD</a>
          <a href="/play" className="text-xs font-head text-text-muted hover:text-white">PLAY</a>
          <span className="font-mono font-bold text-gold">ðŸª™ {tokens}</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">COSMETICS</div>
          <h1 className="font-head font-bold text-3xl text-white">HUNTER SHOP</h1>
          <p className="text-text-muted font-head text-sm mt-1">Customise your identity. Earn tokens by completing rounds or grab a bundle below.</p>
        </div>

        {/* Preview */}
        <div className="bg-navy-light border border-white/10 p-6 mb-8 flex items-center gap-6">
          <Avatar emoji={equipped.avatar} border={equipped.border} size="xl" />
          <div>
            <div className="text-white font-head font-bold text-lg">{userId ? 'Your Avatar' : 'â€”'}</div>
            {equipped.title && <div className="text-gold font-head text-sm mt-1">{equipped.title}</div>}
            <div className="text-text-muted font-head text-xs mt-2">Changes apply instantly across the game</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['avatar', 'border', 'title'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-head font-bold text-xs tracking-widest transition-all border ${activeTab === tab ? 'bg-gold text-navy border-gold' : 'text-text-muted border-white/20 hover:border-gold/40 hover:text-white'}`}>
              {tab.toUpperCase()}S
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(c => {
            const isOwned = owned.has(c.id) || c.is_default
            const equip = isEquipped(c)
            const flash_this = flash?.id === c.id
            return (
              <div key={c.id} className={`bg-navy-light border p-4 flex flex-col items-center gap-3 transition-all ${equip ? 'border-gold/60' : RARITY_COLOR[c.rarity]}`}>
                {c.type === 'avatar' && <Avatar emoji={c.value} border="none" size="lg" />}
                {c.type === 'border' && <Avatar emoji="ðŸŒ" border={c.value} size="lg" />}
                {c.type === 'title' && (
                  <div className="h-16 flex items-center justify-center">
                    <span className={`font-head font-bold text-sm ${RARITY_COLOR[c.rarity].split(' ')[0]}`}>{c.value || 'â€”'}</span>
                  </div>
                )}
                <div className="text-center w-full">
                  <div className="text-white font-head font-bold text-sm">{c.name}</div>
                  <div className={`text-xs font-head ${RARITY_COLOR[c.rarity].split(' ')[0]}`}>{RARITY_LABEL[c.rarity]}</div>
                </div>

                {flash_this && flash ? (
                  <div className={`w-full py-1.5 text-center text-xs font-head font-bold ${flash.success ? 'text-success' : 'text-danger'}`}>
                    {flash.msg}
                  </div>
                ) : equip ? (
                  <div className="w-full py-1.5 text-center text-xs font-head font-bold text-gold border border-gold/40">EQUIPPED</div>
                ) : isOwned ? (
                  <button onClick={() => handleEquip(c)}
                    className="w-full py-1.5 text-xs font-head font-bold text-white border border-white/30 hover:border-electric hover:text-electric transition-all">
                    EQUIP
                  </button>
                ) : (
                  <button onClick={() => handleBuy(c)} disabled={tokens < c.token_cost || buying === c.id}
                    className="w-full py-1.5 text-xs font-head font-bold bg-gold text-navy hover:bg-gold-dim transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    {buying === c.id ? '...' : `ðŸª™ ${c.token_cost}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-text-muted font-head py-16">No items in this category yet.</div>
        )}

        {/* Get more tokens */}
        <div className="mt-10 border border-gold/30 p-6 text-center">
          <div className="text-gold font-head font-bold tracking-widest mb-1">NEED MORE TOKENS?</div>
          <p className="text-text-muted font-head text-sm mb-4">Earn 1 token per completed round, or grab a bundle to unlock exclusive cosmetics.</p>
          <a href="/tokens" className="inline-block px-8 py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all">
            GET TOKENS â†’
          </a>
        </div>
      </div>
    </div>
  )
}
