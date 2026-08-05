export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import SeedShopButton from '@/components/admin/SeedShopButton'
import FixAvatarsButton from '@/components/admin/FixAvatarsButton'
import ChatSqlBlock from '@/components/admin/ChatSqlBlock'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) redirect('/dashboard')

  const [eventRes, realCountRes, fakeCountRes, txRes, recentRealRes] = await Promise.all([
    supabase.from('monthly_events').select('*').eq('status', 'active').maybeSingle(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_fake', false),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_fake', true),
    supabase.from('token_transactions').select('amount').eq('type', 'purchase'),
    supabase.from('profiles').select('id, username, country, created_at')
      .eq('is_fake', false).order('created_at', { ascending: false }).limit(15),
  ])

  const totalRevenue = (txRes.data ?? []).reduce((sum: number, t: any) => sum + t.amount, 0)
  const recentReal = recentRealRes.data ?? []

  const stats = [
    { label: 'REAL HUNTERS', value: realCountRes.count ?? 0 },
    { label: 'SEEDED (FAKE)', value: fakeCountRes.count ?? 0 },
    { label: 'TOKEN REVENUE', value: `🪙 ${totalRevenue.toLocaleString()}` },
    { label: 'ACTIVE EVENT', value: eventRes.data?.name ?? 'None' },
  ]

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center justify-between px-6">
        <span className="font-head font-bold text-gold tracking-widest">WORLD CHASE — ADMIN</span>
        <Link href="/dashboard" className="text-sm font-head text-text-muted hover:text-white">← BACK</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="font-head font-bold text-2xl text-white mb-8">ADMIN DASHBOARD</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {stats.map(s => (
            <div key={s.label} className="bg-navy-light border border-white/10 p-5">
              <div className="text-xs font-head text-text-muted tracking-widest mb-2">{s.label}</div>
              <div className="font-mono font-bold text-gold text-xl">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Real hunters (newest first) — the actual people to go compete against ── */}
        <div className="mb-10 border border-white/10 p-6">
          <div className="text-xs font-head text-gold tracking-widest mb-1">REAL HUNTERS — NEWEST FIRST</div>
          <div className="text-text-muted font-head text-xs mb-4">Excludes seeded/fake accounts. You'll also get a push notification the moment one of these signs up.</div>
          {recentReal.length === 0 ? (
            <div className="text-text-muted font-head text-sm">No real hunters yet.</div>
          ) : (
            <div className="space-y-1">
              {recentReal.map(p => (
                <Link key={p.id} href={`/admin/players`} className="flex items-center justify-between px-3 py-2 border border-white/5 hover:border-gold/30 transition-colors">
                  <span className="font-head font-bold text-white text-sm">{p.username}</span>
                  <span className="text-text-muted font-head text-xs">{p.country ?? '—'} · {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { href: '/admin/events', label: 'MANAGE EVENTS', desc: 'Create and edit weekly events' },
            { href: '/admin/challenges', label: 'MANAGE CHALLENGES', desc: 'Edit rounds, generate with AI' },
            { href: '/admin/players', label: 'MANAGE PLAYERS', desc: 'Search, ban, grant tokens' },
            { href: '/admin/geo-quiz', label: 'GEO QUIZ', desc: 'Schedule, generate questions, run live quiz' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="border border-white/10 p-6 hover:border-gold/30 transition-all group">
              <div className="font-head font-bold text-white group-hover:text-gold transition-colors tracking-wider text-sm mb-1">{l.label}</div>
              <div className="text-text-muted font-head text-xs">{l.desc}</div>
            </Link>
          ))}
        </div>

        {/* ── Shop tools ── */}
        <div className="mt-6 border border-electric/20 p-6">
          <div className="text-xs font-head text-electric tracking-widest mb-1">SHOP TOOLS</div>
          <div className="text-text-muted font-head text-xs mb-4">Seed the shop with avatars, borders and titles. Safe to run once — skips if already seeded.</div>
          <SeedShopButton />
        </div>

        {/* ── Avatar fix ── */}
        <div className="mt-4 border border-danger/20 p-6">
          <div className="text-xs font-head text-danger tracking-widest mb-1">AVATAR CLEANUP</div>
          <div className="text-text-muted font-head text-xs mb-4">
            Replaces all avatar cosmetics with the new clean set — removes the duplicate globe variants (🌎 🌏) and adds better avatars (🦈 🌋 ⛵ 👑 etc). Run once.
          </div>
          <FixAvatarsButton />
        </div>

        {/* ── Chat setup ── */}
        <div className="mt-6 border border-gold/20 p-6">
          <div className="text-xs font-head text-gold tracking-widest mb-1">CHAT SETUP</div>
          <div className="text-text-muted font-head text-xs mb-4 leading-relaxed">
            Run the SQL below <strong className="text-white">once</strong> in the{' '}
            <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer"
               className="text-gold underline hover:text-gold-dim">Supabase SQL Editor ↗</a>{' '}
            to create the chat messages <strong className="text-white">and</strong> reactions tables.
            Safe to run again — uses <code className="text-white">IF NOT EXISTS</code>.
            Then click <strong className="text-white">SEED SHOP CATALOGUE</strong> above to add reaction emojis to the shop.
          </div>

          {/* SQL block with header + copy button */}
          <ChatSqlBlock />

          <p className="text-text-muted font-head text-xs mt-3">
            After running, visit <a href="/chat" className="text-gold underline hover:text-gold-dim">/chat</a> and click <strong className="text-white">Check Again</strong> to verify.
          </p>
        </div>
      </div>
    </div>
  )
}
