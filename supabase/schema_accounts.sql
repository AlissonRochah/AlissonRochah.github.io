-- ============================================================
-- Resort Manager — Accounts / Profiles schema
-- Run this in: Supabase Studio > SQL Editor
-- ============================================================

-- Profiles table for account management
create table if not exists public.profiles (
    id          uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique,
    email       text not null,
    full_name   text default '',
    role        text default 'editor' check (role in ('admin', 'editor', 'viewer')),
    created_at  timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
    on public.profiles for select
    to authenticated
    using (true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert"
    on public.profiles for insert
    to authenticated
    with check (true);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
    on public.profiles for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete"
    on public.profiles for delete
    to authenticated
    using (true);

-- Helper function to delete an auth user (called via RPC from the app).
-- SECURITY DEFINER runs with the function owner's privileges (postgres),
-- allowing deletion from auth.users which is otherwise inaccessible.
create or replace function public.delete_auth_user(target_user_id uuid)
returns void as $$
begin
    delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer;
