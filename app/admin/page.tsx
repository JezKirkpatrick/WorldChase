export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import SeedShopButton from '@/components/admin/SeedShopButton'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const [eventRes, profileCountRes, txRes] = await Promise.all([
    supabase.from('monthly_events').select('*').eq('status', 'active').maybeSingle(),
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('token_transactions').select('amount').eq('type', 'purchase'),
  ])

  const totalRevenue = (txRes.data ?? []).reduce((sum: number, t: any) => sum + t.amount, 0)

  const stats = [
    { label: 'TOTAL HUNTERS', value: profileCountRes.count ?? 0 },
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

        <div className="grid grid-cols-3 gap-4 mb-10">
          {stats.map(s => (
            <div key={s.label} className="bg-navy-light border border-white/10 p-5">
              <div className="text-xs font-head text-text-muted tracking-widest mb-2">{s.label}</div>
              <div className="font-mono font-bold text-gold text-xl">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { href: '/admin/events', label: 'MANAGE EVENTS', desc: 'Create and edit monthly events' },
            { href: '/admin/challenges', label: 'MANAGE CHALLENGES', desc: 'Edit rounds, generate with AI' },
            { href: '/admin/players', label: 'MANAGE PLAYERS', desc: 'Search, ban, grant tokens' },
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

        {/* ── Chat setup ── */}
        <div className="mt-6 border border-gold/20 p-6">
          <div className="text-xs font-head text-gold tracking-widest mb-1">CHAT SETUP</div>
          <div className="text-text-muted font-head text-xs mb-4 leading-relaxed">
            Run the SQL below <strong className="text-white">once</strong> in the{' '}
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
               className="text-gold underline hover:text-gold-dim">Supabase SQL Editor</a>{' '}
            to create the chat table. Safe to skip if already done.
          </div>
          <pre className="bg-black/40 border border-white/10 p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre leading-relaxed">
{`create table if not exists public.chat_messages (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now(),
  constraint  chat_messages_content_length
    check (char_length(content) between 1 and 300)
);

alter table public.chat_messages enable row level security;

create policy "Authenticated users can read chat"
  on public.chat_messages for select
  using (auth.role() = 'authenticated');

create policy "Users can send their own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages(created_at asc);

alter publication supabase_realtime
  add table public.chat_messages;`}
          </pre>
          <p className="text-text-muted font-head text-xs mt-3">
            After running, visit <a href="/chat" className="text-gold underline">/chat</a> to confirm it works.
          </p>
        </div>
      </div>
    </div>
  )
}
