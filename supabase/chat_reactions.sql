-- ── Chat reactions ──────────────────────────────────────────────────
-- Run this in the Supabase SQL editor (safe to run alongside chat_messages.sql)

create table if not exists public.chat_reactions (
  id          uuid        default gen_random_uuid() primary key,
  message_id  uuid        not null references public.chat_messages(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  emoji       text        not null,
  created_at  timestamptz not null default now(),
  unique(message_id, user_id, emoji)  -- one of each emoji per user per message
);

alter table public.chat_reactions enable row level security;

create policy "Authenticated users can read reactions"
  on public.chat_reactions for select
  using (auth.role() = 'authenticated');

create policy "Users can add their own reactions"
  on public.chat_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own reactions"
  on public.chat_reactions for delete
  using (auth.uid() = user_id);

create index if not exists chat_reactions_message_idx
  on public.chat_reactions(message_id);

alter publication supabase_realtime add table public.chat_reactions;
