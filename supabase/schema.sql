-- Jev 学習クエスト: Supabase スキーマ
-- Supabase ダッシュボードの SQL Editor に貼り付けて 1 回実行してください（何度実行しても安全です）。
--
-- セキュリティ方針
--   * すべてのテーブルで行レベルセキュリティ (RLS) を有効化
--   * アプリのサーバーは service_role キーを使わず、ログインユーザー本人のトークンで DB にアクセスする
--   * 許可リスト (allowed_users) に載っているメールアドレスの本人だけが、自分の行だけを読み書きできる
--   * 未ログイン (anon) からは一切アクセスできない

-- 1. 利用を許可するユーザーのメールアドレス
create table if not exists public.allowed_users (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- 2. ユーザーごとの学習データ（素材と学習記録を 1 つの JSON で保存）
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.allowed_users enable row level security;
alter table public.user_data enable row level security;

-- anon からの権限をすべて外す（RLS に加えた二重の防御）
revoke all on public.allowed_users from anon;
revoke all on public.user_data from anon;
grant select on public.allowed_users to authenticated;
grant select, insert, update on public.user_data to authenticated;

-- ログイン中のユーザーが許可リストに載っているか
create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_allowed_user() from public, anon;
grant execute on function public.is_allowed_user() to authenticated;

-- allowed_users: 自分のメールアドレスの行だけ見える（追加・変更はダッシュボードからのみ）
drop policy if exists "allowed_users: read own row" on public.allowed_users;
create policy "allowed_users: read own row"
  on public.allowed_users for select
  to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- user_data: 許可されたユーザー本人の行だけ読み書きできる
drop policy if exists "user_data: select own" on public.user_data;
create policy "user_data: select own"
  on public.user_data for select
  to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()));

drop policy if exists "user_data: insert own" on public.user_data;
create policy "user_data: insert own"
  on public.user_data for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));

drop policy if exists "user_data: update own" on public.user_data;
create policy "user_data: update own"
  on public.user_data for update
  to authenticated
  using (user_id = (select auth.uid()) and (select public.is_allowed_user()))
  with check (user_id = (select auth.uid()) and (select public.is_allowed_user()));

-- 3. 自分のメールアドレスを許可リストに追加（GitHub アカウントのメールアドレスに置き換えて実行）
-- insert into public.allowed_users (email) values ('you@example.com') on conflict do nothing;
