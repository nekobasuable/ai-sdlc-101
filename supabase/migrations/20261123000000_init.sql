-- plan/003: データの土台。全テーブルは user_id を持ち、本人の行だけを読み書きできる(spec N6)

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 項目(spec 4.3 Item、変更 1 の Google ToDo の対応を含む)
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null,
  area text check (area in ('work', 'skill', 'school', 'private', 'business')),
  quadrant smallint check (quadrant between 1 and 4),
  due_date date,
  status text not null default 'inbox' check (status in ('inbox', 'candidate', 'someday', 'done')),
  google_task_id text,
  google_list_id text,
  google_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 同じ Google ToDo のタスクを二重に取り込まない(spec C13)
  unique (user_id, google_task_id)
);

-- 週の計画での配置と、その結果(spec 4.3 の Slot と Result をまとめたもの)
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  week_start date not null,
  day smallint not null check (day between 0 and 6),
  block_id text not null,
  result text check (result in ('done', 'partial', 'not_done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  note text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.weekly_reviews (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  memo text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  time_zone text not null default 'Asia/Tokyo',
  blocks jsonb,
  notifications jsonb not null default '{}'::jsonb,
  calendar_write boolean not null default false,
  ai_classify boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Google ToDo のリストと領域の結びつき(spec R29、R31)
create table public.task_list_links (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  google_list_id text not null,
  area text check (area in ('work', 'skill', 'school', 'private', 'business')),
  is_default boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, google_list_id)
);

-- Google の長期の鍵(spec C12)。ポリシーを付けないので、ブラウザからは本人でも読めない
create table public.google_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- 更新時刻の自動更新と、本人だけのポリシー
do $$
declare
  t text;
begin
  foreach t in array array['items', 'placements', 'daily_notes', 'weekly_reviews', 'settings', 'task_list_links', 'google_credentials'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array['items', 'placements', 'daily_notes', 'weekly_reviews', 'settings', 'task_list_links'] loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;
