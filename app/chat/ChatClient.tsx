'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export const FREE_REACTIONS = ['👍', '👎', '❤️', '😂', '😮', '😢']

// ── Types ─────────────────────────────────────────────────────────────
type Profile = {
  username: string
  display_name: string | null
  equipped_avatar: string | null
  equipped_title: string | null
}
type Message = {
  id: string
  user_id: string
  content: string
  created_at: string
  profile: Profile
}
type ReactionGroup = { emoji: string; count: number; reacted: boolean }
type ReactionsMap  = Record<string, ReactionGroup[]>

const GHOST: Profile = { username: 'hunter', display_name: null, equipped_avatar: '🌍', equipped_title: null }

function timeStr(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function addRx(prev: ReactionsMap, msgId: string, emoji: string, byUser: string, myId: string): ReactionsMap {
  const list = prev[msgId] ?? []
  const hit  = list.find(g => g.emoji === emoji)
  if (hit) {
    return { ...prev, [msgId]: list.map(g => g.emoji === emoji ? { ...g, count: g.count + 1, reacted: g.reacted || byUser === myId } : g) }
  }
  return { ...prev, [msgId]: [...list, { emoji, count: 1, reacted: byUser === myId }] }
}

function removeRx(prev: ReactionsMap, msgId: string, emoji: string, byUser: string, myId: string): ReactionsMap {
  const list = prev[msgId] ?? []
  const hit  = list.find(g => g.emoji === emoji)
  if (!hit) return prev
  if (hit.count <= 1) return { ...prev, [msgId]: list.filter(g => g.emoji !== emoji) }
  return { ...prev, [msgId]: list.map(g => g.emoji === emoji ? { ...g, count: g.count - 1, reacted: g.reacted && byUser !== myId } : g) }
}

const CHAT_SQL = `create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_content_length check (char_length(content) between 1 and 300)
);
alter table public.chat_messages enable row level security;
create policy "read_chat" on public.chat_messages for select using (auth.role() = 'authenticated');
create policy "insert_chat" on public.chat_messages for insert with check (auth.uid() = user_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at asc);
alter publication supabase_realtime add table public.chat_messages;

create table if not exists public.chat_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);
alter table public.chat_reactions enable row level security;
create policy "read_rx" on public.chat_reactions for select using (auth.role() = 'authenticated');
create policy "insert_rx" on public.chat_reactions for insert with check (auth.uid() = user_id);
create policy "delete_rx" on public.chat_reactions for delete using (auth.uid() = user_id);
create index if not exists chat_reactions_message_idx on public.chat_reactions(message_id);
alter publication supabase_realtime add table public.chat_reactions;`

// ── Component ─────────────────────────────────────────────────────────
export default function ChatClient({ userId }: { userId: string }) {
  const [messages,      setMessages]      = useState<Message[]>([])
  const [reactions,     setReactions]     = useState<ReactionsMap>({})
  const [ownedEmojis,   setOwnedEmojis]   = useState<Set<string>>(new Set())
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [onlineCount,   setOnlineCount]   = useState(0)
  const [myProfile,     setMyProfile]     = useState<Profile>(GHOST)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [tableReady,    setTableReady]    = useState(true)
  const [sqlCopied,     setSqlCopied]     = useState(false)
  const [pickerMsgId,   setPickerMsgId]   = useState<string | null>(null)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const profileCache = useRef<Record<string, Profile>>({})

  function nearBottom() {
    const el = scrollRef.current
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }
  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }

  // Close picker on outside click
  useEffect(() => {
    if (!pickerMsgId) return
    function handle(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-picker]')) setPickerMsgId(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pickerMsgId])

  useEffect(() => {
    const supabase = createClient()
    let msgCh:  ReturnType<typeof supabase.channel> | null = null
    let rxCh:   ReturnType<typeof supabase.channel> | null = null
    let presCh: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      // My profile
      const { data: me } = await supabase
        .from('profiles').select('username,display_name,equipped_avatar,equipped_title')
        .eq('id', userId).maybeSingle()
      if (me) { setMyProfile(me as Profile); profileCache.current[userId] = me as Profile }

      // Owned premium reaction emojis
      const { data: ownedRows } = await supabase
        .from('user_cosmetics').select('cosmetics(type,value)').eq('user_id', userId)
      const emojiSet = new Set<string>()
      for (const row of ownedRows ?? []) {
        const c = (row as any).cosmetics
        if (c?.type === 'chat_emoji') emojiSet.add(c.value as string)
      }
      setOwnedEmojis(emojiSet)

      // Recent messages
      const { data: rows, error } = await supabase
        .from('chat_messages')
        .select('id,user_id,content,created_at,profiles(username,display_name,equipped_avatar,equipped_title)')
        .order('created_at', { ascending: true }).limit(100)
      if (error) { setTableReady(false); return }

      const msgs: Message[] = (rows ?? []).map((r: any) => {
        const p = (r.profiles ?? GHOST) as Profile
        profileCache.current[r.user_id] = p
        return { id: r.id, user_id: r.user_id, content: r.content, created_at: r.created_at, profile: p }
      })
      setMessages(msgs)

      // Reactions for loaded messages
      if (msgs.length > 0) {
        const { data: rxData } = await supabase
          .from('chat_reactions').select('message_id,emoji,user_id')
          .in('message_id', msgs.map(m => m.id))
        if (rxData) {
          const grouped: ReactionsMap = {}
          for (const rx of rxData) {
            if (!grouped[rx.message_id]) grouped[rx.message_id] = []
            const g = grouped[rx.message_id].find(g => g.emoji === rx.emoji)
            if (g) { g.count++; if (rx.user_id === userId) g.reacted = true }
            else grouped[rx.message_id].push({ emoji: rx.emoji, count: 1, reacted: rx.user_id === userId })
          }
          setReactions(grouped)
        }
      }

      // Realtime — messages
      msgCh = supabase.channel('wc_chat_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload: any) => {
          const row = payload.new as { id: string; user_id: string; content: string; created_at: string }
          let profile = profileCache.current[row.user_id]
          if (!profile) {
            const { data } = await supabase.from('profiles')
              .select('username,display_name,equipped_avatar,equipped_title')
              .eq('id', row.user_id).maybeSingle()
            profile = (data as Profile) ?? GHOST
            profileCache.current[row.user_id] = profile
          }
          setMessages(prev => [...prev, { ...row, profile }])
        }).subscribe()

      // Realtime — reactions
      rxCh = supabase.channel('wc_chat_reactions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_reactions' }, (payload: any) => {
          const { message_id, emoji, user_id } = payload.new
          setReactions(prev => addRx(prev, message_id, emoji, user_id, userId))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_reactions' }, (payload: any) => {
          const { message_id, emoji, user_id } = payload.old
          setReactions(prev => removeRx(prev, message_id, emoji, user_id, userId))
        }).subscribe()

      // Presence
      presCh = supabase.channel('wc_chat_presence', { config: { presence: { key: userId } } })
        .on('presence', { event: 'sync' }, () => {
          setOnlineCount(Object.keys(presCh!.presenceState()).length)
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') await presCh!.track({ user_id: userId })
        })
    }

    init()
    return () => {
      if (msgCh)  supabase.removeChannel(msgCh)
      if (rxCh)   supabase.removeChannel(rxCh)
      if (presCh) supabase.removeChannel(presCh)
    }
  }, [userId])

  useEffect(() => {
    if (!messages.length) return
    if (nearBottom()) { scrollToBottom(messages.length > 1); setShowScrollBtn(false) }
    else setShowScrollBtn(true)
  }, [messages])

  useEffect(() => { inputRef.current?.focus() }, [])

  async function send() {
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)
    const supabase = createClient()
    await supabase.from('chat_messages').insert({ user_id: userId, content: content.slice(0, 300) })
    setSending(false)
    setShowScrollBtn(false)
    setTimeout(() => scrollToBottom(true), 60)
    inputRef.current?.focus()
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!FREE_REACTIONS.includes(emoji) && !ownedEmojis.has(emoji)) return
    const supabase = createClient()
    const reacted = reactions[messageId]?.find(g => g.emoji === emoji)?.reacted
    if (reacted) {
      await supabase.from('chat_reactions').delete().match({ message_id: messageId, user_id: userId, emoji })
    } else {
      await supabase.from('chat_reactions').insert({ message_id: messageId, user_id: userId, emoji })
    }
  }

  // ── Not set up ───────────────────────────────────────────────────────
  if (!tableReady) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="max-w-2xl w-full flex flex-col gap-5">
          <div className="text-center">
            <div className="text-3xl mb-3">🔧</div>
            <div className="text-gold font-head font-bold tracking-widest text-lg">ONE-TIME SETUP NEEDED</div>
            <p className="text-text-muted font-head text-sm mt-2 leading-relaxed">
              Copy the SQL below, paste into the Supabase SQL Editor, and click Run.
            </p>
          </div>
          <div className="border border-white/10 bg-black/40">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <span className="text-xs font-head text-text-muted tracking-widest">SQL — run once</span>
              <button onClick={() => { navigator.clipboard.writeText(CHAT_SQL); setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2500) }}
                className={`text-xs font-head font-bold tracking-widest px-3 py-1 border transition-all ${sqlCopied ? 'border-green-400/50 text-green-400' : 'border-gold/40 text-gold hover:border-gold'}`}>
                {sqlCopied ? '✓ COPIED!' : 'COPY SQL'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre leading-relaxed">{CHAT_SQL}</pre>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer"
               className="flex-1 text-center px-5 py-2.5 border border-gold/40 text-gold font-head text-xs font-bold tracking-widest hover:border-gold hover:bg-gold/5 transition-all">
              OPEN SUPABASE SQL EDITOR ↗
            </a>
            <button onClick={() => window.location.reload()}
              className="flex-1 px-5 py-2.5 border border-white/20 text-text-muted font-head text-xs font-bold tracking-widest hover:border-white/50 hover:text-white transition-all">
              ↻ CHECK AGAIN
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main UI ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="max-w-3xl w-full mx-auto flex flex-col h-full px-4 pt-5 pb-4 gap-3">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-head font-bold text-gold tracking-widest text-lg leading-none">🌐 HUNTER CHAT</h1>
            <p className="text-text-muted font-head text-xs mt-1">Global chat · everyone sees this</p>
          </div>
          {onlineCount > 0 && (
            <div className="flex items-center gap-1.5 bg-navy-light border border-white/10 px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="text-green-400 font-head font-bold text-xs tracking-wider">
                {onlineCount} {onlineCount === 1 ? 'HUNTER' : 'HUNTERS'} HERE
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={() => { if (nearBottom()) setShowScrollBtn(false) }}
             className="flex-1 overflow-y-auto min-h-0 flex flex-col"
             style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}>

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 opacity-40 select-none">
              <span className="text-5xl">💬</span>
              <span className="text-text-muted font-head text-sm tracking-widest">NO MESSAGES YET</span>
            </div>
          )}

          <div className="flex flex-col gap-0">
            {messages.map((msg, i) => {
              const prev    = messages[i - 1]
              const isMine  = msg.user_id === userId
              const grouped = prev?.user_id === msg.user_id &&
                new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
              const msgRx   = reactions[msg.id] ?? []
              const msgId   = msg.id

              // Reaction pills + picker — plain JSX, no nested component
              const rxRow = (
                <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                  {[...msgRx].sort((a, b) => b.count - a.count).map(g => (
                    <button key={g.emoji} onClick={() => toggleReaction(msgId, g.emoji)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                        g.reacted
                          ? 'bg-gold/15 border-gold/40 text-gold'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/25 hover:text-white/90'
                      }`}>
                      <span>{g.emoji}</span>
                      <span className="font-mono text-[11px]">{g.count}</span>
                    </button>
                  ))}

                  {/* Add-reaction trigger */}
                  <div className="relative" data-picker>
                    <button
                      onClick={() => setPickerMsgId(pickerMsgId === msgId ? null : msgId)}
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border border-white/10 text-white/30 hover:text-white/70 hover:border-white/25 transition-all ${msgRx.length === 0 ? 'opacity-0 group-hover:opacity-100' : ''}`}
                      title="Add reaction"
                    >
                      <span>😊</span><span className="font-bold">+</span>
                    </button>

                    {pickerMsgId === msgId && (
                      <div className="absolute bottom-full left-0 mb-1 z-50 p-2 border border-white/15 bg-[#0c1423] shadow-2xl flex flex-wrap gap-1.5 w-56">
                        <div className="w-full text-[9px] font-head text-text-muted/60 tracking-widest mb-0.5">FREE</div>
                        {FREE_REACTIONS.map(e => (
                          <button key={e} onClick={() => { toggleReaction(msgId, e); setPickerMsgId(null) }}
                            className={`w-8 h-8 flex items-center justify-center text-xl hover:bg-white/10 rounded transition-all ${msgRx.find(g => g.emoji === e)?.reacted ? 'bg-gold/15 ring-1 ring-gold/40' : ''}`}>
                            {e}
                          </button>
                        ))}
                        {ownedEmojis.size > 0 && (
                          <>
                            <div className="w-full border-t border-white/10 mt-0.5" />
                            <div className="w-full text-[9px] font-head text-gold/60 tracking-widest mb-0.5">YOUR REACTIONS</div>
                            {[...ownedEmojis].map(e => (
                              <button key={e} onClick={() => { toggleReaction(msgId, e); setPickerMsgId(null) }}
                                className={`w-8 h-8 flex items-center justify-center text-xl hover:bg-white/10 rounded transition-all ${msgRx.find(g => g.emoji === e)?.reacted ? 'bg-gold/15 ring-1 ring-gold/40' : ''}`}>
                                {e}
                              </button>
                            ))}
                          </>
                        )}
                        <div className="w-full border-t border-white/10 mt-0.5 pt-1 text-center">
                          <Link href="/shop" onClick={() => setPickerMsgId(null)}
                            className="text-[10px] font-head text-gold/50 hover:text-gold transition-colors">
                            🪙 unlock more reactions
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )

              if (grouped) {
                return (
                  <div key={msg.id} className="flex flex-col pl-10 px-1 py-0.5 group hover:bg-white/[0.02] rounded">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 shrink-0" />
                      <p className="text-white/85 text-sm break-words leading-relaxed flex-1 min-w-0">{msg.content}</p>
                      <span className="text-white/20 font-mono text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                        {timeStr(msg.created_at)}
                      </span>
                    </div>
                    <div className="pl-8">{rxRow}</div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex flex-col px-1 pt-3 pb-0.5 hover:bg-white/[0.02] rounded group">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0 mt-0.5 ${isMine ? 'bg-gold/15 ring-1 ring-gold/30' : 'bg-white/8'}`}>
                      {msg.profile.equipped_avatar ?? '🌍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-head font-bold text-sm leading-none ${isMine ? 'text-gold' : 'text-white'}`}>
                          {msg.profile.display_name || msg.profile.username}
                        </span>
                        {msg.profile.equipped_title && (
                          <span className="text-text-muted font-head text-xs">· {msg.profile.equipped_title}</span>
                        )}
                        <span className="font-mono text-xs text-white/25 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {timeStr(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-white/85 text-sm mt-1 break-words leading-relaxed">{msg.content}</p>
                      {rxRow}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div ref={bottomRef} className="h-1" />
        </div>

        {showScrollBtn && (
          <div className="shrink-0 flex justify-center -mt-1">
            <button onClick={() => { scrollToBottom(true); setShowScrollBtn(false) }}
              className="text-xs font-head text-gold border border-gold/30 px-4 py-1 hover:border-gold hover:bg-gold/5 transition-all">
              ↓ NEW MESSAGES
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="shrink-0 border border-white/10 bg-navy-light flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gold/15 ring-1 ring-gold/30 flex items-center justify-center text-base shrink-0">
            {myProfile.equipped_avatar ?? '🌍'}
          </div>
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value.slice(0, 300))}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Message all hunters… (Enter to send)"
            className="flex-1 bg-transparent text-white font-head text-sm placeholder:text-text-muted outline-none py-1 min-w-0"
          />
          {input.length > 0 && (
            <span className={`font-mono text-xs shrink-0 ${input.length > 280 ? 'text-danger' : 'text-text-muted'}`}>
              {input.length}/300
            </span>
          )}
          <button onClick={send} disabled={!input.trim() || sending}
            className="px-4 py-1.5 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            {sending ? '···' : 'SEND'}
          </button>
        </div>

      </div>
    </div>
  )
}
