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
type PickerPos     = { top?: number; bottom?: number; left: number }

const GHOST: Profile = { username: 'hunter', display_name: null, equipped_avatar: '🌍', equipped_title: null }

function timeStr(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isUrl(s?: string | null) {
  return typeof s === 'string' && s.startsWith('http')
}

function AvatarBubble({ src, mine, size = 8 }: { src?: string | null; mine?: boolean; size?: number }) {
  const avatar = src ?? '🌍'
  const px = size * 4
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden ${mine ? 'ring-1 ring-gold/40 bg-gold/10' : 'bg-white/8'}`}
      style={{ width: px, height: px, fontSize: px * 0.5 }}>
      {isUrl(avatar)
        ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
        : avatar}
    </div>
  )
}

function addRx(prev: ReactionsMap, msgId: string, emoji: string, byUser: string, myId: string): ReactionsMap {
  const list = prev[msgId] ?? []
  const hit  = list.find(g => g.emoji === emoji)
  if (hit) return { ...prev, [msgId]: list.map(g => g.emoji === emoji ? { ...g, count: g.count + 1, reacted: g.reacted || byUser === myId } : g) }
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
alter publication supabase_realtime add table public.chat_reactions;
alter table public.chat_reactions replica identity full;`

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
  const [pickerPos,     setPickerPos]     = useState<PickerPos | null>(null)

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
  function closePicker() { setPickerMsgId(null); setPickerPos(null) }

  function openPicker(msgId: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (pickerMsgId === msgId) { closePicker(); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const above = rect.top > window.innerHeight / 2
    setPickerMsgId(msgId)
    setPickerPos({
      left: Math.max(4, Math.min(rect.left - 4, window.innerWidth - 252)),
      ...(above
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    })
  }

  // Close picker on outside click
  useEffect(() => {
    if (!pickerMsgId) return
    function handle(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-picker]')) closePicker()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pickerMsgId])

  useEffect(() => {
    const supabase = createClient()
    let msgCh:  ReturnType<typeof supabase.channel> | null = null
    let rxCh:   ReturnType<typeof supabase.channel> | null = null
    let presCh: ReturnType<typeof supabase.channel> | null = null

    localStorage.setItem('wc_chat_last_visit', String(Date.now()))

    async function init() {
      const { data: me } = await supabase
        .from('profiles').select('username,display_name,equipped_avatar,equipped_title')
        .eq('id', userId).maybeSingle()
      if (me) { setMyProfile(me as Profile); profileCache.current[userId] = me as Profile }

      const { data: ownedRows } = await supabase
        .from('user_cosmetics').select('cosmetics(type,value)').eq('user_id', userId)
      const emojiSet = new Set<string>()
      for (const row of ownedRows ?? []) {
        const c = (row as any).cosmetics
        if (c?.type === 'chat_emoji') emojiSet.add(c.value as string)
      }
      setOwnedEmojis(emojiSet)

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

      rxCh = supabase.channel('wc_chat_reactions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_reactions' }, (payload: any) => {
          const { message_id, emoji, user_id } = payload.new
          setReactions(prev => addRx(prev, message_id, emoji, user_id, userId))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_reactions' }, (payload: any) => {
          const { message_id, emoji, user_id } = payload.old
          setReactions(prev => removeRx(prev, message_id, emoji, user_id, userId))
        }).subscribe()

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
      setReactions(prev => removeRx(prev, messageId, emoji, userId, userId))
      const { error } = await supabase.from('chat_reactions').delete().match({ message_id: messageId, user_id: userId, emoji })
      if (error) setReactions(prev => addRx(prev, messageId, emoji, userId, userId))
    } else {
      setReactions(prev => addRx(prev, messageId, emoji, userId, userId))
      const { error } = await supabase.from('chat_reactions').insert({ message_id: messageId, user_id: userId, emoji })
      if (error) setReactions(prev => removeRx(prev, messageId, emoji, userId, userId))
    }
  }

  // ── Not set up ────────────────────────────────────────────────────────
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

  // ── Main UI ───────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex flex-col flex-1 min-h-0" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="max-w-3xl w-full mx-auto flex flex-col h-full">

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-white/8 px-5 py-3 flex items-center justify-between bg-navy-light/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="font-head font-bold text-white tracking-widest text-sm leading-none">HUNTER CHAT</div>
              <div className="text-text-muted font-head text-xs tracking-wider mt-0.5">Global · everyone online sees this</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onlineCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 border border-green-400/20 bg-green-400/5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                <span className="text-green-400 font-head font-bold text-xs tracking-widest">
                  {onlineCount} {onlineCount === 1 ? 'ONLINE' : 'ONLINE'}
                </span>
              </div>
            )}
            <Link href="/shop" className="text-xs font-head text-text-muted hover:text-gold transition-colors tracking-widest">
              🪙 REACTIONS
            </Link>
          </div>
        </div>

        {/* ── Messages ── */}
        <div
          ref={scrollRef}
          onScroll={() => {
            if (nearBottom()) setShowScrollBtn(false)
            if (pickerMsgId) closePicker()
          }}
          className="flex-1 overflow-y-auto min-h-0 px-4 py-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 select-none">
              <span className="text-5xl">💬</span>
              <span className="text-text-muted font-head text-xs tracking-[0.3em]">NO MESSAGES YET — SAY HELLO</span>
            </div>
          )}

          {messages.map((msg, i) => {
            const prev    = messages[i - 1]
            const isMine  = msg.user_id === userId
            const grouped = prev?.user_id === msg.user_id &&
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
            const msgRx = reactions[msg.id] ?? []
            const msgId = msg.id

            const reactionRow = (msgRx.length > 0 || true) && (
              <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                {[...msgRx].sort((a, b) => b.count - a.count).map(g => (
                  <button key={g.emoji} onClick={() => toggleReaction(msgId, g.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                      g.reacted
                        ? 'bg-gold/15 border-gold/40 text-gold'
                        : 'bg-white/5 border-white/10 text-white/55 hover:bg-white/10 hover:border-white/25 hover:text-white/90'
                    }`}>
                    <span>{g.emoji}</span>
                    <span className="font-mono text-xs leading-none">{g.count}</span>
                  </button>
                ))}

                {/* Add-reaction trigger */}
                <div data-picker>
                  <button
                    onClick={e => openPicker(msgId, e)}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-all
                      ${pickerMsgId === msgId
                        ? 'border-gold/40 bg-gold/10 text-gold'
                        : 'border-white/10 text-white/25 hover:text-white/60 hover:border-white/25'}
                      ${msgRx.length === 0 ? 'opacity-0 group-hover:opacity-100' : ''}`}
                    title="Add reaction"
                  >
                    <span className="text-base leading-none">😊</span>
                    <span className="font-bold text-[10px]">+</span>
                  </button>
                </div>
              </div>
            )

            if (grouped) {
              return (
                <div key={msg.id} className="flex flex-col pl-[42px] py-0.5 group hover:bg-white/[0.015] rounded px-1 -mx-1">
                  <p className="text-white/80 text-sm break-words leading-relaxed">{msg.content}</p>
                  {reactionRow}
                </div>
              )
            }

            return (
              <div key={msg.id} className="flex flex-col px-1 -mx-1 pt-3 pb-0.5 group hover:bg-white/[0.015] rounded">
                <div className="flex items-start gap-2.5">
                  <AvatarBubble src={msg.profile.equipped_avatar} mine={isMine} size={8} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`font-head font-bold text-sm leading-none ${isMine ? 'text-gold' : 'text-white'}`}>
                        {msg.profile.display_name || msg.profile.username}
                      </span>
                      {msg.profile.equipped_title && (
                        <span className="text-xs font-head text-text-muted border border-white/10 px-1.5 py-0.5 leading-none">
                          {msg.profile.equipped_title}
                        </span>
                      )}
                      <span className="font-mono text-xs text-white/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {timeStr(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm mt-1 break-words leading-relaxed">{msg.content}</p>
                    {reactionRow}
                  </div>
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} className="h-2" />
        </div>

        {/* ── Scroll-to-bottom pill ── */}
        {showScrollBtn && (
          <div className="shrink-0 flex justify-center py-1.5">
            <button onClick={() => { scrollToBottom(true); setShowScrollBtn(false) }}
              className="text-xs font-head text-gold border border-gold/30 px-4 py-1.5 tracking-widest hover:border-gold hover:bg-gold/5 transition-all">
              ↓ NEW MESSAGES
            </button>
          </div>
        )}

        {/* ── Input bar ── */}
        <div className="shrink-0 border-t border-white/8 bg-navy-light/60 backdrop-blur px-4 py-3 pb-safe flex items-center gap-3">
          <AvatarBubble src={myProfile.equipped_avatar} mine size={7} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 300))}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Message all hunters…"
            className="flex-1 bg-transparent text-white/90 font-head text-sm placeholder:text-white/20 outline-none min-w-0"
          />
          {input.length > 250 && (
            <span className={`font-mono text-xs shrink-0 ${input.length > 280 ? 'text-danger' : 'text-text-muted'}`}>
              {300 - input.length}
            </span>
          )}
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="px-4 py-1.5 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? '···' : 'SEND'}
          </button>
        </div>

      </div>
    </div>

    {/* ── Reaction picker — fixed, always on-screen ── */}
    {pickerMsgId && pickerPos && (
      <div data-picker
        className="fixed z-[200] p-2.5 border border-white/15 bg-[#0c1423]/95 backdrop-blur shadow-2xl w-60"
        style={pickerPos}>
        <div className="text-xs font-head text-text-muted/50 tracking-widest mb-1.5">FREE REACTIONS</div>
        <div className="flex flex-wrap gap-1">
          {FREE_REACTIONS.map(e => {
            const active = reactions[pickerMsgId]?.find(g => g.emoji === e)?.reacted
            return (
              <button key={e} onClick={() => { toggleReaction(pickerMsgId, e); closePicker() }}
                className={`w-9 h-9 flex items-center justify-center text-xl rounded transition-all hover:bg-white/10 ${active ? 'bg-gold/15 ring-1 ring-gold/40' : ''}`}>
                {e}
              </button>
            )
          })}
        </div>
        {ownedEmojis.size > 0 && (
          <>
            <div className="border-t border-white/10 my-2" />
            <div className="text-xs font-head text-gold/50 tracking-widest mb-1.5">YOUR REACTIONS</div>
            <div className="flex flex-wrap gap-1">
              {[...ownedEmojis].map(e => {
                const active = reactions[pickerMsgId]?.find(g => g.emoji === e)?.reacted
                return (
                  <button key={e} onClick={() => { toggleReaction(pickerMsgId, e); closePicker() }}
                    className={`w-9 h-9 flex items-center justify-center text-xl rounded transition-all hover:bg-white/10 ${active ? 'bg-gold/15 ring-1 ring-gold/40' : ''}`}>
                    {e}
                  </button>
                )
              })}
            </div>
          </>
        )}
        <div className="border-t border-white/10 mt-2 pt-2 text-center">
          <Link href="/shop" onClick={closePicker}
            className="text-xs font-head text-gold/40 hover:text-gold transition-colors tracking-wide">
            🪙 unlock more reactions
          </Link>
        </div>
      </div>
    )}
    </>
  )
}
