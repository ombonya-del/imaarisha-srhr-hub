-- Unado social: likes + comments on field-activity posts.
-- Members-only (authenticated). Anyone signed in can read/like/comment; you can
-- remove your own like or comment; admins can remove any comment.

-- Likes --------------------------------------------------------------------
create table if not exists public.unado_reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.unado_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);
alter table public.unado_reactions enable row level security;

drop policy if exists unado_reactions_read on public.unado_reactions;
create policy unado_reactions_read on public.unado_reactions
  for select to authenticated using (true);

drop policy if exists unado_reactions_insert on public.unado_reactions;
create policy unado_reactions_insert on public.unado_reactions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists unado_reactions_delete on public.unado_reactions;
create policy unado_reactions_delete on public.unado_reactions
  for delete to authenticated using (user_id = auth.uid());

-- Comments -----------------------------------------------------------------
create table if not exists public.unado_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.unado_posts(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  author_name text,
  body        text not null,
  created_at  timestamptz default now()
);
alter table public.unado_comments enable row level security;

drop policy if exists unado_comments_read on public.unado_comments;
create policy unado_comments_read on public.unado_comments
  for select to authenticated using (true);

drop policy if exists unado_comments_insert on public.unado_comments;
create policy unado_comments_insert on public.unado_comments
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists unado_comments_delete on public.unado_comments;
create policy unado_comments_delete on public.unado_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create index if not exists unado_reactions_post_idx on public.unado_reactions(post_id);
create index if not exists unado_comments_post_idx  on public.unado_comments(post_id);
