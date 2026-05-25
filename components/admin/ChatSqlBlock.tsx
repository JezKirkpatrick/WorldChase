'use client'
import { useState } from 'react'

const CHAT_SQL = `-- messages
create table if not exists public.chat_messages (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now(),
  constraint  chat_messages_content_length
    check (char_length(content) between 1 and 300)
);
alter table public.chat_messages enable row level security;
create policy "Authenticated users can read chat"
  on public.chat_messages for select using (auth.role() = 'authenticated');
create policy "Users can send their own messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);
create index if not exists chat_messages_created_at_idx
  on public.chat_messages(created_at asc);
alter publication supabase_realtime add table public.chat_messages;

-- reactions
create table if not exists public.chat_reactions (
  id          uuid        default gen_random_uuid() primary key,
  message_id  uuid        not null references public.chat_messages(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  emoji       text        not null,
  created_at  timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);
alter table public.chat_reactions enable row level security;
create policy "Authenticated users can read reactions"
  on public.chat_reactions for select using (auth.role() = 'authenticated');
create policy "Users can add their own reactions"
  on public.chat_reactions for insert with check (auth.uid() = user_id);
create policy "Users can remove their own reactions"
  on public.chat_reactions for delete using (auth.uid() = user_id);
create index if not exists chat_reactions_message_idx
  on public.chat_reactions(message_id);
alter publication supabase_realtime add table public.chat_reactions;`

export default function ChatSqlBlock() {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(CHAT_SQL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="border border-white/10">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
        <span className="text-xs font-head text-text-muted tracking-widest">chat_messages + chat_reactions migration</span>
        <button
          onClick={copy}
          className={`text-xs font-head font-bold tracking-widest px-3 py-1 border transition-all ${
            copied ? 'border-green-400/50 text-green-400' : 'border-gold/40 text-gold hover:border-gold hover:bg-gold/5'
          }`}
        >
          {copied ? '✓ COPIED!' : 'COPY SQL'}
        </button>
      </div>
      <pre className="bg-black/40 p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre leading-relaxed">
        {CHAT_SQL}
      </pre>
    </div>
  )
}
