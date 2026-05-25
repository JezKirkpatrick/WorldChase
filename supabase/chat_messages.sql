-- ── Chat messages table ─────────────────────────────────────────────
-- Run this once in the Supabase SQL editor

create table if not exists public.chat_messages (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now(),
  constraint  chat_messages_content_length check (char_length(content) between 1 and 300)
);

-- Row-level security
alter table public.chat_messages enable row level security;

create policy "Authenticated users can read chat"
  on public.chat_messages for select
  using (auth.role() = 'authenticated');

create policy "Users can send their own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

-- Index for fast chronological queries
create index if not exists chat_messages_created_at_idx
  on public.chat_messages(created_at asc);

-- Add to realtime publication so new rows broadcast instantly
alter publication supabase_realtime add table public.chat_messages;
