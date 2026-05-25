'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const CHAT_SQL = `create table if not exists public.chat_messages (
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
  add table public.chat_messages;`

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

const GHOST: Profile = { username: 'hunter', display_name: null, equipped_avatar: '🌍', equipped_title: null }

function timeStr(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatClient({ userId }: { userId: string }) {
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [onlineCount,   setOnlineCount]   = useState(0)
  const [myProfile,     setMyProfile]     = useState<Profile>(GHOST)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [tableReady,    setTableReady]    = useState(true) // assume OK; flip on error
  const [sqlCopied,     setSqlCopied]     = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const profileCache = useRef<Record<string, Profile>>({})

  function nearBottom() {
    const el = scrollRef.current
    return !el || (el.scrollHeight - el.scrollTop - el.clientHeight) < 80
  }

  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }

  useEffect(() => {
    const supabase = createClient()
    let msgCh: ReturnType<typeof supabase.channel> | null = null
    let presCh: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      // ── My profile ──────────────────────────────────────────────────
      const { data: me } = await supabase
        .from('profiles')
        .select('username, display_name, equipped_avatar, equipped_title')
        .eq('id', userId)
        .maybeSingle()

      if (me) {
        setMyProfile(me as Profile)
        profileCache.current[userId] = me as Profile
      }

      // ── Recent messages (joined to profiles) ────────────────────────
      const { data: rows, error } = await supabase
        .from('chat_messages')
        .select('id, user_id, content, created_at, profiles(username, display_name, equipped_avatar, equipped_title)')
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        // Table likely doesn't exist yet
        setTableReady(false)
        return
      }

      if (rows) {
        const msgs: Message[] = rows.map((r: any) => {
          const p = (r.profiles ?? GHOST) as Profile
          profileCache.current[r.user_id] = p
          return { id: r.id, user_id: r.user_id, content: r.content, created_at: r.created_at, profile: p }
        })
        setMessages(msgs)
      }

      // ── Real-time: new messages ──────────────────────────────────────
      msgCh = supabase
        .channel('wc_chat_messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          async (payload: any) => {
            const row = payload.new as { id: string; user_id: string; content: string; created_at: string }
            let profile = profileCache.current[row.user_id]
            if (!profile) {
              const { data } = await supabase
                .from('profiles')
                .select('username, display_name, equipped_avatar, equipped_title')
                .eq('id', row.user_id)
                .maybeSingle()
              profile = (data as Profile) ?? GHOST
              profileCache.current[row.user_id] = profile
            }
            setMessages(prev => [...prev, { ...row, profile }])
          }
        )
        .subscribe()

      // ── Presence: how many people are in this chat ───────────────────
      presCh = supabase
        .channel('wc_chat_presence', { config: { presence: { key: userId } } })
        .on('presence', { event: 'sync' }, () => {
          setOnlineCount(Object.keys(presCh!.presenceState()).length)
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presCh!.track({ user_id: userId })
          }
        })
    }

    init()

    return () => {
      if (msgCh) supabase.removeChannel(msgCh)
      if (presCh) supabase.removeChannel(presCh)
    }
  }, [userId])

  // Auto-scroll when messages update
  useEffect(() => {
    if (messages.length === 0) return
    if (nearBottom()) {
      scrollToBottom(messages.length > 1)
      setShowScrollBtn(false)
    } else {
      setShowScrollBtn(true)
    }
  }, [messages])

  // Focus input on mount
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

  // ── Table not set up yet — show self-serve SQL panel ────────────────
  if (!tableReady) {
    function copySql() {
      navigator.clipboard.writeText(CHAT_SQL).then(() => {
        setSqlCopied(true)
        setTimeout(() => setSqlCopied(false), 2500)
      })
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="max-w-2xl w-full flex flex-col gap-5">

          {/* Title */}
          <div className="text-center">
            <div className="text-3xl mb-3">🔧</div>
            <div className="text-gold font-head font-bold tracking-widest text-lg">ONE-TIME SETUP NEEDED</div>
            <p className="text-text-muted font-head text-sm mt-2 leading-relaxed">
              Copy the SQL below, open the Supabase SQL Editor, paste it in and click <strong className="text-white">Run</strong>.
              The chat will be live instantly for all players.
            </p>
          </div>

          {/* SQL block */}
          <div className="border border-white/10 bg-black/40">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <span className="text-xs font-head text-text-muted tracking-widest">SQL — run once in Supabase</span>
              <button
                onClick={copySql}
                className={`text-xs font-head font-bold tracking-widest px-3 py-1 border transition-all ${
                  sqlCopied
                    ? 'border-green-400/50 text-green-400'
                    : 'border-gold/40 text-gold hover:border-gold hover:bg-gold/5'
                }`}
              >
                {sqlCopied ? '✓ COPIED!' : 'COPY SQL'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre leading-relaxed">
              {CHAT_SQL}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://supabase.com/dashboard/project/_/sql/new"
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center px-5 py-2.5 border border-gold/40 text-gold font-head text-xs font-bold tracking-widest hover:border-gold hover:bg-gold/5 transition-all"
            >
              OPEN SUPABASE SQL EDITOR ↗
            </a>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-5 py-2.5 border border-white/20 text-text-muted font-head text-xs font-bold tracking-widest hover:border-white/50 hover:text-white transition-all"
            >
              ↻ CHECK AGAIN
            </button>
          </div>

          <p className="text-center text-text-muted font-head text-xs">
            After running the SQL, click <strong className="text-white">Check Again</strong> — no page reload needed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="max-w-3xl w-full mx-auto flex flex-col h-full px-4 pt-5 pb-4 gap-3">

        {/* ── Header ─────────────────────────────────────────────────── */}
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

        {/* ── Messages ───────────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          onScroll={() => { if (nearBottom()) setShowScrollBtn(false) }}
          className="flex-1 overflow-y-auto min-h-0 flex flex-col"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 opacity-40 select-none">
              <span className="text-5xl">💬</span>
              <span className="text-text-muted font-head text-sm tracking-widest">NO MESSAGES YET</span>
              <span className="text-text-muted font-head text-xs">Be the first hunter to say hello</span>
            </div>
          )}

          <div className="flex flex-col gap-0">
            {messages.map((msg, i) => {
              const prev      = messages[i - 1]
              const isMine    = msg.user_id === userId
              const grouped   = prev?.user_id === msg.user_id &&
                new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000
              const name      = msg.profile.display_name || msg.profile.username
              const avatar    = msg.profile.equipped_avatar ?? '🌍'

              if (grouped) {
                return (
                  <div key={msg.id} className="flex items-start gap-2.5 px-1 py-0.5 group hover:bg-white/[0.02] rounded">
                    {/* Invisible avatar placeholder to align with non-grouped */}
                    <div className="w-8 shrink-0" />
                    <p className="text-white/85 text-sm break-words leading-relaxed flex-1 min-w-0">{msg.content}</p>
                    <span className="text-white/20 font-mono text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      {timeStr(msg.created_at)}
                    </span>
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex items-start gap-2.5 px-1 pt-3 pb-0.5 hover:bg-white/[0.02] rounded group">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0 mt-0.5 ${
                    isMine ? 'bg-gold/15 ring-1 ring-gold/30' : 'bg-white/8'
                  }`}>
                    {avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`font-head font-bold text-sm leading-none ${isMine ? 'text-gold' : 'text-white'}`}>
                        {name}
                      </span>
                      {msg.profile.equipped_title && (
                        <span className="text-text-muted font-head text-xs">
                          · {msg.profile.equipped_title}
                        </span>
                      )}
                      <span className="font-mono text-xs text-white/25 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {timeStr(msg.created_at)}
                      </span>
                    </div>
                    {/* Message text */}
                    <p className="text-white/85 text-sm mt-1 break-words leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div ref={bottomRef} className="h-1" />
        </div>

        {/* ── Jump-to-bottom button ───────────────────────────────────── */}
        {showScrollBtn && (
          <div className="shrink-0 flex justify-center -mt-1">
            <button
              onClick={() => { scrollToBottom(true); setShowScrollBtn(false) }}
              className="text-xs font-head text-gold border border-gold/30 px-4 py-1 hover:border-gold hover:bg-gold/5 transition-all"
            >
              ↓ NEW MESSAGES
            </button>
          </div>
        )}

        {/* ── Input bar ──────────────────────────────────────────────── */}
        <div className="shrink-0 border border-white/10 bg-navy-light flex items-center gap-3 px-3 py-2">
          {/* My avatar */}
          <div className="w-7 h-7 rounded-full bg-gold/15 ring-1 ring-gold/30 flex items-center justify-center text-base shrink-0">
            {myProfile.equipped_avatar ?? '🌍'}
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 300))}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Message all hunters… (Enter to send)"
            className="flex-1 bg-transparent text-white font-head text-sm placeholder:text-text-muted outline-none py-1 min-w-0"
          />

          {/* Char count */}
          {input.length > 0 && (
            <span className={`font-mono text-xs shrink-0 ${input.length > 280 ? 'text-danger' : 'text-text-muted'}`}>
              {input.length}/300
            </span>
          )}

          {/* Send button */}
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="px-4 py-1.5 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? '···' : 'SEND'}
          </button>
        </div>

      </div>
    </div>
  )
}
