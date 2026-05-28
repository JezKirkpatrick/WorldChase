-- Run this once in your Supabase SQL Editor

create table if not exists public.friendships (
  id           uuid        default gen_random_uuid() primary key,
  requester_id uuid        not null references public.profiles(id) on delete cascade,
  addressee_id uuid        not null references public.profiles(id) on delete cascade,
  status       text        not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at   timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

alter table public.friendships enable row level security;
create policy "see_own_friendships"    on public.friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "send_friend_request"    on public.friendships for insert with check (auth.uid() = requester_id);
create policy "respond_to_request"     on public.friendships for update using (auth.uid() = addressee_id or auth.uid() = requester_id);
create policy "delete_friendship"      on public.friendships for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

create table if not exists public.direct_messages (
  id           uuid        default gen_random_uuid() primary key,
  sender_id    uuid        not null references public.profiles(id) on delete cascade,
  recipient_id uuid        not null references public.profiles(id) on delete cascade,
  content      text        not null check (char_length(content) between 1 and 300),
  created_at   timestamptz not null default now()
);

alter table public.direct_messages enable row level security;
create policy "see_own_dms"   on public.direct_messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "send_dm"       on public.direct_messages for insert with check (auth.uid() = sender_id);

create index if not exists dm_conversation_idx on public.direct_messages(least(sender_id::text, recipient_id::text), greatest(sender_id::text, recipient_id::text), created_at);

alter publication supabase_realtime add table public.direct_messages;
alter table public.direct_messages replica identity full;
