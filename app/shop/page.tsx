'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import Avatar from '@/components/ui/Avatar'
import AvatarUploadModal from '@/components/shop/AvatarUploadModal'

// ── Rarity theming ────────────────────────────────────────────────
const R = {
  common: {
    label: 'COMMON',
    pill: 'bg-white/10 text-white/55 border border-white/15',
    card: 'border-white/15',
    cardGlow: '',
    titleBox: 'text-white/80 border-white/25 bg-white/5',
    avatarBg: 'bg-white/8',
    buyBtn: 'bg-white/10 text-white border border-white/20 hover:bg-white/15',
    shadow: '',
  },
  rare: {
    label: 'RARE',
    pill: 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/25',
    card: 'border-cyan-400/30',
    cardGlow: 'from-cyan-400/8 to-transparent',
    titleBox: 'text-cyan-300 border-cyan-400/40 bg-cyan-400/8',
    avatarBg: 'bg-cyan-400/10',
    buyBtn: 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/20',
    shadow: 'shadow-cyan-400/15',
  },
  epic: {
    label: 'EPIC',
    pill: 'bg-purple-500/15 text-purple-300 border border-purple-400/25',
    card: 'border-purple-500/35',
    cardGlow: 'from-purple-500/10 to-transparent',
    titleBox: 'text-purple-300 border-purple-400/45 bg-purple-500/8',
    avatarBg: 'bg-purple-500/10',
    buyBtn: 'bg-purple-500/10 text-purple-300 border border-purple-400/30 hover:bg-purple-500/20',
    shadow: 'shadow-purple-500/20',
  },
  legendary: {
    label: 'LEGENDARY',
    pill: 'bg-gold/15 text-gold border border-gold/30',
    card: 'border-gold/50',
    cardGlow: 'from-gold/10 to-transparent',
    titleBox: 'text-gold border-gold/60 bg-gold/8',
    avatarBg: 'bg-gold/8',
    buyBtn: 'bg-gold text-navy hover:bg-gold-dim',
    shadow: 'shadow-gold/25',
  },
  ultimate: {
    label: 'ULTIMATE',
    pill: 'text-white border border-gold/50',
    card: 'border-gold/70',
    cardGlow: 'from-gold/12 via-electric/8 to-transparent',
    titleBox: 'text-white border-gold/70 bg-gold/10',
    avatarBg: 'bg-gold/10',
    buyBtn: 'text-navy font-bold',
    shadow: 'shadow-gold/35',
  },
} as const

type RarityKey = keyof typeof R
const rarity = (r: string) => R[(r as RarityKey) in R ? (r as RarityKey) : 'common']

// ── Border descriptions ───────────────────────────────────────────
const BORDER_TAGLINE: Record<string, string> = {
  electric:  'Spinning neon cyan arc',
  thorns:    'Dark spiked thorn ring',
  fire:      'Blazing fire gradient spin',
  gold:      'Golden spin + crown above',
  diamond:   'Fast crystal ice spin + sparkles',
  legendary: 'Slow void cosmic orbit',
  ocean:     'Deep sea blue wave spin',
  rainbow:   'Full spectrum colour spin',
  galaxy:    'Dark nebula with orbiting stars',
  none:      'Clean & minimal',
}

// ── Tab labels ────────────────────────────────────────────────────
const TAB_ICONS: Record<string, string> = { avatar: '🧑', border: '⬡', title: '🏷', chat_emoji: '💬' }

const FREE_REACTIONS = ['👍', '👎', '❤️', '😂', '😮', '😢']

export default function ShopPage() {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [tokens, setTokens] = useState(0)
  const [cosmetics, setCosmetics] = useState<any[]>([])
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [equipped, setEquipped] = useState<{ avatar: string; border: string; title: string }>({
    avatar: '🌍', border: 'none', title: '',
  })
  const [activeTab, setActiveTab] = useState<'avatar' | 'border' | 'title' | 'chat_emoji'>('avatar')
  const [buying, setBuying] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; success: boolean; msg: string } | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      supabase.from('profiles')
        .select('tokens,equipped_avatar,equipped_border,equipped_title')
        .eq('id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setTokens(data.tokens ?? 0)
            setEquipped({
              avatar: data.equipped_avatar ?? '🌍',
              border: data.equipped_border ?? 'none',
              title:  data.equipped_title  ?? '',
            })
          }
        })

      // Load shop cosmetics — filter out arena rewards client-side
      supabase.from('cosmetics').select('*').order('token_cost')
        .then(({ data }) =>
          setCosmetics((data ?? []).filter(c => c.metadata?.arena_reward !== 'true'))
        )

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
      toast(data.error, 'error')
    } else {
      setTokens(data.newTokenBalance)
      setOwned(prev => new Set([...prev, cosmetic.id]))
      setFlash({ id: cosmetic.id, success: true, msg: 'Unlocked!' })
      toast(`${cosmetic.name} unlocked!`, 'token')
    }
    setBuying(null)
    setTimeout(() => setFlash(null), 2000)
  }

  async function handleEquip(cosmetic: any) {
    if (!userId) return
    const field =
      cosmetic.type === 'avatar' ? 'equipped_avatar'
      : cosmetic.type === 'border' ? 'equipped_border'
      : 'equipped_title'
    await supabase.from('profiles').update({ [field]: cosmetic.value }).eq('id', userId)
    setEquipped(prev => ({ ...prev, [cosmetic.type]: cosmetic.value }))
    setFlash({ id: cosmetic.id, success: true, msg: 'Equipped!' })
    toast(`${cosmetic.name} equipped!`, 'success')
    setTimeout(() => setFlash(null), 1500)
  }

  const filtered = cosmetics.filter(c => c.type === activeTab)
  const isEquipped = (c: any) => {
    if (c.type === 'avatar' && c.value === 'custom_upload')
      return equipped.avatar.startsWith('http')
    return (c.type === 'avatar'  && equipped.avatar === c.value) ||
           (c.type === 'border'  && equipped.border === c.value) ||
           (c.type === 'title'   && equipped.title  === c.value)
  }

  return (
    <>
    <div className="min-h-screen bg-navy text-text">

      {/* ── Nav ── */}
      <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        <Link href="/dashboard" className="font-head font-bold text-gold tracking-widest hover:text-gold-dim transition-colors whitespace-nowrap">
          ≡ WORLD CHASE
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/leaderboard" className="text-xs font-head text-text-muted hover:text-white transition-colors hidden sm:block">LEADERBOARD</Link>
          <Link href="/play"        className="text-xs font-head text-text-muted hover:text-white transition-colors hidden sm:block">PLAY</Link>
          <span className="font-mono font-bold text-gold text-sm">🪙 {tokens}</span>
          <Link href="/tokens" className="text-xs font-head text-gold/70 hover:text-gold transition-colors border border-gold/30 px-2 py-0.5 hover:border-gold/60 whitespace-nowrap">
            GET MORE →
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-1">COSMETICS</div>
          <h1 className="font-head font-bold text-3xl text-white">HUNTER SHOP</h1>
          <p className="text-text-muted font-head text-sm mt-1">
            Customise your identity. Earn tokens by completing rounds or grab a bundle.
          </p>
        </div>

        {/* ── Live preview ── */}
        <div className="border border-white/10 p-4 sm:p-6 mb-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.05) 0%, rgba(15,21,53,1) 55%)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />
          <div className="relative shrink-0">
            <Avatar emoji={equipped.avatar} border={equipped.border} size="xl" />
            {equipped.border && equipped.border !== 'none' && equipped.border !== '' && (
              <div className="absolute -inset-3 rounded-full blur-2xl opacity-15 bg-gold -z-10" />
            )}
          </div>
          <div>
            <div className="text-text-muted font-head text-xs tracking-widest mb-1">PREVIEW</div>
            <div className="text-white font-head font-bold text-xl">Your Hunter</div>
            {equipped.title ? (
              <div className="mt-2 inline-flex items-center gap-2">
                <span className="text-gold font-head text-sm font-bold border border-gold/35 bg-gold/8 px-3 py-1">
                  {equipped.title}
                </span>
              </div>
            ) : (
              <div className="mt-2 text-text-muted/50 font-head text-sm italic">No title equipped</div>
            )}
            <div className="text-text-muted/50 font-head text-xs mt-2">Changes apply instantly</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-2 mb-7 overflow-x-auto pb-1 scrollbar-hide">
          {(['avatar', 'border', 'title', 'chat_emoji'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 font-head font-bold text-xs tracking-widest transition-all border ${
                activeTab === tab
                  ? 'bg-gold text-navy border-gold'
                  : 'text-text-muted border-white/20 hover:border-gold/40 hover:text-white'
              }`}>
              <span>{TAB_ICONS[tab]}</span>
              <span>{tab === 'avatar' ? 'AVATARS' : tab === 'border' ? 'BORDERS' : tab === 'title' ? 'TITLES' : 'REACTIONS'}</span>
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${activeTab === tab ? 'bg-navy/20' : 'bg-white/10'}`}>
                {tab === 'chat_emoji' ? cosmetics.filter(c => c.type === 'chat_emoji').length : cosmetics.filter(c => c.type === tab).length}
              </span>
            </button>
          ))}
          <div className="ml-auto text-sm font-mono text-text-muted">
            Balance: <span className="text-gold font-bold">🪙 {tokens}</span>
          </div>
        </div>

        {/* ── Free reactions banner (REACTIONS tab only) ── */}
        {activeTab === 'chat_emoji' && (
          <div className="mb-6 border border-success/20 bg-success/5 p-4">
            <div className="text-success font-head font-bold text-xs tracking-widest mb-2">FREE REACTIONS — ALWAYS AVAILABLE TO EVERYONE</div>
            <div className="flex gap-3 text-3xl mb-2">
              {FREE_REACTIONS.map(e => <span key={e}>{e}</span>)}
            </div>
            <p className="text-text-muted font-head text-xs">
              These 6 reactions are free. Unlock premium reactions below to stand out in chat — hover any message and click <strong className="text-white">😊+</strong> to react.
            </p>
          </div>
        )}

        {/* ── Item grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(c => {
            const isOwned  = owned.has(c.id) || c.is_default
            const equip    = isEquipped(c)
            const r        = rarity(c.rarity)
            const flashMe  = flash?.id === c.id

            return (
              <div key={c.id}
                className={`relative bg-navy-light border-2 flex flex-col items-center overflow-hidden transition-all duration-200 ${
                  equip ? 'border-gold shadow-lg shadow-gold/20' : `${r.card} ${r.shadow ? `shadow-lg ${r.shadow}` : ''}`
                }`}>

                {/* Rarity gradient wash */}
                {c.rarity !== 'common' && (
                  <div className={`absolute inset-0 bg-gradient-to-b ${r.cardGlow} pointer-events-none`} />
                )}

                {/* Equipped top bar */}
                {equip && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gold z-10" />}

                {/* Rarity pill */}
                <div className={`absolute top-2.5 right-2.5 text-xs font-head font-bold px-1.5 py-0.5 ${r.pill} z-10`}>
                  {r.label}
                </div>

                {/* ── Preview area ── */}
                <div className="w-full flex items-center justify-center pt-6 pb-3 px-4 relative min-h-[110px]">

                  {(c.type === 'avatar' || c.type === 'chat_emoji') && (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl overflow-hidden ${r.avatarBg}`}
                         style={c.rarity === 'ultimate' ? { boxShadow: '0 0 28px rgba(245,197,24,0.25)' } : c.rarity === 'legendary' ? { boxShadow: '0 0 24px rgba(245,197,24,0.18)' } : c.rarity === 'epic' ? { boxShadow: '0 0 18px rgba(168,85,247,0.18)' } : c.rarity === 'rare' ? { boxShadow: '0 0 14px rgba(34,211,238,0.12)' } : {}}>
                      {c.value === 'custom_upload'
                        ? (equipped.avatar.startsWith('http')
                            ? <img src={equipped.avatar} alt="avatar" className="w-full h-full object-cover" />
                            : <span className="text-4xl">📸</span>)
                        : c.value}
                    </div>
                  )}

                  {c.type === 'border' && (
                    <div className="flex flex-col items-center gap-2">
                      <Avatar emoji={equipped.avatar || '🌍'} border={c.value} size="lg" />
                      <div className="text-xs font-head text-text-muted/70 tracking-wider text-center">
                        {BORDER_TAGLINE[c.value] ?? ''}
                      </div>
                    </div>
                  )}

                  {c.type === 'title' && (
                    <div className="w-full flex items-center justify-center px-2">
                      <div className={`w-full px-3 py-3 border font-head font-bold text-sm tracking-wider text-center leading-snug ${r.titleBox}`}
                           style={
                             c.rarity === 'legendary' ? { boxShadow: '0 0 16px rgba(245,197,24,0.22)' }
                             : c.rarity === 'epic'    ? { boxShadow: '0 0 12px rgba(168,85,247,0.18)' }
                             : c.rarity === 'rare'    ? { boxShadow: '0 0 10px rgba(34,211,238,0.15)' }
                             : {}
                           }>
                        {c.value || '—'}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Item info ── */}
                <div className="w-full px-4 pb-1 text-center relative">
                  <div className="text-white font-head font-bold text-sm">{c.name}</div>
                  {c.value === 'custom_upload' && (
                    <div className="mt-1 text-xs font-head text-text-muted leading-snug">
                      Upload your own photo as your avatar
                    </div>
                  )}
                </div>

                {/* ── Action button ── */}
                <div className="w-full px-3 pb-3 pt-1 mt-auto relative">
                  {flashMe && flash ? (
                    <div className={`w-full py-2 text-center text-xs font-head font-bold ${flash.success ? 'text-success' : 'text-danger'}`}>
                      {flash.msg}
                    </div>

                  ) : equip && c.value === 'custom_upload' ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full py-1.5 text-center text-xs font-head font-bold text-gold border border-gold/50 bg-gold/5">
                        ✓ EQUIPPED
                      </div>
                      <button onClick={() => setShowUploadModal(true)}
                        className="w-full py-1.5 text-xs font-head font-bold transition-all"
                        style={{ background: 'linear-gradient(90deg, #f5c518, #00d4ff)', color: '#0a0e27' }}>
                        CHANGE PHOTO
                      </button>
                    </div>

                  ) : equip ? (
                    <div className="w-full py-2 text-center text-xs font-head font-bold text-gold border border-gold/50 bg-gold/5">
                      ✓ EQUIPPED
                    </div>

                  ) : isOwned && c.value === 'custom_upload' ? (
                    <button onClick={() => setShowUploadModal(true)}
                      className="w-full py-3 text-xs font-head font-bold transition-all"
                      style={{ background: 'linear-gradient(90deg, #f5c518, #00d4ff)', color: '#0a0e27' }}>
                      UPLOAD PHOTO →
                    </button>

                  ) : isOwned && c.type === 'chat_emoji' ? (
                    <div className="w-full py-2 text-center text-xs font-head font-bold text-success border border-success/30 bg-success/5">
                      ✓ UNLOCKED · USE IN CHAT
                    </div>

                  ) : isOwned ? (
                    <button onClick={() => handleEquip(c)}
                      className="w-full py-3 text-xs font-head font-bold text-white border border-white/25 hover:border-electric hover:text-electric transition-all">
                      EQUIP →
                    </button>

                  ) : c.token_cost === 0 ? (
                    <button onClick={() => handleBuy(c)}
                      className="w-full py-3 text-xs font-head font-bold text-success border border-success/30 bg-success/5 hover:bg-success/10 transition-all">
                      FREE — CLAIM
                    </button>

                  ) : (
                    <button
                      onClick={() => handleBuy(c)}
                      disabled={tokens < c.token_cost || buying === c.id}
                      className={`w-full py-3 text-xs font-head font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${c.rarity !== 'ultimate' ? r.buyBtn : ''}`}
                      style={
                        c.rarity === 'ultimate' && tokens >= c.token_cost
                          ? { background: 'linear-gradient(90deg, #f5c518, #00d4ff)', color: '#0a0e27', boxShadow: '0 0 18px rgba(245,197,24,0.35)' }
                          : c.rarity === 'ultimate'
                          ? { background: 'rgba(255,255,255,0.08)', color: '#7a7a9a' }
                          : c.rarity === 'legendary' && tokens >= c.token_cost
                          ? { boxShadow: '0 0 14px rgba(245,197,24,0.28)' }
                          : {}
                      }>
                      {buying === c.id ? '...' : `🪙 ${c.token_cost}`}
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-text-muted font-head py-20">
            <div className="text-3xl mb-3">🧭</div>
            <div className="text-sm">Nothing here yet — check back soon.</div>
          </div>
        )}

        {/* ── Rarity legend ── */}
        <div className="mt-8 flex flex-wrap gap-3 items-center">
          <span className="text-text-muted/50 font-head text-xs tracking-widest">RARITY:</span>
          {(['common', 'rare', 'epic', 'legendary'] as const).map(r => (
            <span key={r} className={`text-xs font-head font-bold px-2 py-1 ${R[r].pill}`}>
              {R[r].label}
            </span>
          ))}
          <span className="text-xs font-head font-bold px-2 py-1 text-white border border-gold/50"
            style={{ background: 'linear-gradient(90deg, rgba(245,197,24,0.15), rgba(0,212,255,0.1))' }}>
            ULTIMATE
          </span>
          <span className="ml-auto text-text-muted/40 font-head text-xs">Arena titles & borders earned through ranked play</span>
        </div>

        {/* ── Get more tokens ── */}
        <div className="mt-8 border border-gold/25 p-6 text-center relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.05) 0%, transparent 60%)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />
          <div className="text-gold font-head font-bold tracking-widest mb-1">NEED MORE TOKENS?</div>
          <p className="text-text-muted font-head text-sm mb-4">
            Earn 1 token per completed round, or grab a bundle to unlock exclusive cosmetics instantly.
          </p>
          <Link href="/tokens"
            className="inline-block px-8 py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all"
            style={{ boxShadow: '0 0 20px rgba(245,197,24,0.25)' }}>
            GET TOKENS →
          </Link>
        </div>

      </div>
    </div>

    {showUploadModal && (
      <AvatarUploadModal
        onSuccess={(url) => {
          setEquipped(prev => ({ ...prev, avatar: url }))
          setShowUploadModal(false)
          router.refresh()
          toast('Ultimate avatar equipped!', 'success')
        }}
        onClose={() => setShowUploadModal(false)}
      />
    )}
    </>
  )
}
