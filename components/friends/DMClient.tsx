'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { safeDisplayName, safeHandle } from '@/lib/userDisplay'

type DMMessage = { id: string; sender_id: string; recipient_id?: string; content: string; created_at: string }
type FriendProfile = { id: string; username: string | null; display_name: string | null; equipped_avatar: string | null }

function timeStr(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isUrl(s?: string | null) { return typeof s === 'string' && s.startsWith('http') }

function AvatarImg({ src, size = 8 }: { src?: string | null; size?: number }) {
  const px = size * 4
  const avatar = src ?? '🌍'
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-navy border border-white/10"
      style={{ width: px, height: px, fontSize: px * 0.5 }}>
      {isUrl(avatar) ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : avatar}
    </div>
  )
}

export default function DMClient({ myId, friend }: { myId: string; friend: FriendProfile }) {
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let ch: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const { data } = await supabase
        .from('direct_messages')
        .select('id,sender_id,content,created_at')
        .or(`and(sender_id.eq.${myId},recipient_id.eq.${friend.id}),and(sender_id.eq.${friend.id},recipient_id.eq.${myId})`)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages((data ?? []) as DMMessage[])
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50)

      ch = supabase.channel(`wc_dm_${[myId, friend.id].sort().join('_')}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload: any) => {
          const row = payload.new as DMMessage
          if ((row.sender_id === friend.id && row.recipient_id === myId) ||
              (row.sender_id === myId && row.recipient_id === friend.id)) {
            setMessages(prev => {
              const idx = prev.findIndex(m => m.id.startsWith('opt_') && m.content === row.content && m.sender_id === row.sender_id)
              if (idx !== -1) { const next = [...prev]; next[idx] = row; return next }
              return [...prev, row]
            })
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          }
        })
        .subscribe()
    }

    init()
    inputRef.current?.focus()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [myId, friend.id])

  async function send() {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setInput('')
    const opt: DMMessage = { id: `opt_${Date.now()}`, sender_id: myId, content, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, opt])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    const supabase = createClient()
    await supabase.from('direct_messages').insert({ sender_id: myId, recipient_id: friend.id, content: content.slice(0, 300) })
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-navy-light px-4 py-3 flex items-center gap-3">
        <Link href="/friends" className="text-text-muted hover:text-white font-head text-xs tracking-widest transition-colors">← FRIENDS</Link>
        <div className="w-px h-4 bg-white/20" />
        <AvatarImg src={friend.equipped_avatar} size={8} />
        <div>
          <div className="font-head font-bold text-white text-sm">{safeDisplayName(friend)}</div>
          <div className="text-text-muted font-head text-xs">@{safeHandle(friend)}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 flex flex-col gap-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 opacity-40 select-none">
            <span className="text-5xl">💬</span>
            <span className="text-text-muted font-head text-sm tracking-widest">START THE CONVERSATION</span>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine  = msg.sender_id === myId
          const prev    = messages[i - 1]
          const grouped = prev?.sender_id === msg.sender_id &&
            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 300_000

          return (
            <div key={msg.id} className={`flex items-end gap-2 flex-row ${grouped ? 'mt-0.5' : 'mt-3'}`}>
              {/* Avatar — only on first message in a group */}
              {!grouped
                ? <AvatarImg src={isMine ? undefined : friend.equipped_avatar} size={7} />
                : <div style={{ width: 28 }} className="shrink-0" />
              }
              <div className="group" style={{ maxWidth: '68%' }}>
                {!grouped && (
                  <div className={`font-head text-xs mb-0.5 ${isMine ? 'text-gold/60' : 'text-text-muted'}`}>
                    {isMine ? 'You' : safeDisplayName(friend)}
                  </div>
                )}
                <div className={`px-3 py-2 font-head text-sm leading-relaxed break-words rounded-tr-xl rounded-tl-sm rounded-br-xl ${
                  isMine
                    ? 'bg-gold/15 border border-gold/30 text-white'
                    : 'bg-white/8 border border-white/10 text-white'
                } ${msg.id.startsWith('opt_') ? 'opacity-60' : ''}`}>
                  {msg.content}
                </div>
                <div className="font-mono text-xs mt-0.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                  {timeStr(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/10 bg-navy-light flex items-center gap-3 px-4 py-2">
        <input ref={inputRef} type="text" value={input}
          onChange={e => setInput(e.target.value.slice(0, 300))}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          placeholder={`Message ${safeDisplayName(friend)}…`}
          className="flex-1 bg-transparent text-white font-head text-sm placeholder:text-text-muted outline-none py-1 min-w-0"
        />
        {input.length > 0 && (
          <span className={`font-mono text-xs shrink-0 ${input.length > 280 ? 'text-danger' : 'text-text-muted'}`}>{input.length}/300</span>
        )}
        <button onClick={send} disabled={!input.trim() || sending}
          className="px-4 py-1.5 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
          {sending ? '···' : 'SEND'}
        </button>
      </div>
    </div>
  )
}
