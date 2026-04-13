-- ============================================================
-- Message Templates schema (Supabase port of Firestore structure)
-- Run this in: Supabase Studio > SQL Editor
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- templates
-- One row per template per user.
-- Name is unique per user (matches original Firestore doc ID).
-- ------------------------------------------------------------
create table if not exists public.templates (
    id            uuid primary key default gen_random_uuid(),
    auth_user_id  uuid not null references auth.users(id) on delete cascade,
    name          text not null,
    description   text not null default '',
    category      text default '',
    sort_order    int default 0,
    ai_summary    text default '',
    created_at    timestamptz default now(),
    updated_at    timestamptz default now(),
    unique (auth_user_id, name)
);

create index if not exists templates_user_order_idx
    on public.templates (auth_user_id, sort_order);

alter table public.templates enable row level security;

drop policy if exists "templates_select_own" on public.templates;
create policy "templates_select_own" on public.templates
    for select to authenticated
    using (auth.uid() = auth_user_id);

drop policy if exists "templates_insert_own" on public.templates;
create policy "templates_insert_own" on public.templates
    for insert to authenticated
    with check (auth.uid() = auth_user_id);

drop policy if exists "templates_update_own" on public.templates;
create policy "templates_update_own" on public.templates
    for update to authenticated
    using (auth.uid() = auth_user_id)
    with check (auth.uid() = auth_user_id);

drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_delete_own" on public.templates
    for delete to authenticated
    using (auth.uid() = auth_user_id);

-- ------------------------------------------------------------
-- user_settings
-- Single row per user. Auto-upserted by client on load.
-- ------------------------------------------------------------
create table if not exists public.user_settings (
    auth_user_id       uuid primary key references auth.users(id) on delete cascade,
    categories         text[] not null default '{}',
    favorites          text[] not null default '{}',
    greeting           text not null default 'Hello',
    greeting_mode      text not null default 'fixed',
    random_greetings   text[] not null default '{}',
    signature_enabled  boolean not null default false,
    signature_mode     text not null default 'fixed',
    signature_text     text not null default '',
    random_signatures  text[] not null default '{}',
    ai_enabled         boolean not null default false,
    extension_id       text not null default '',
    updated_at         timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
    for select to authenticated
    using (auth.uid() = auth_user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
    for insert to authenticated
    with check (auth.uid() = auth_user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
    for update to authenticated
    using (auth.uid() = auth_user_id)
    with check (auth.uid() = auth_user_id);

-- ------------------------------------------------------------
-- global_settings
-- Key/value store for admin-managed config (AI URL, Groq key, etc.).
-- All authenticated users can read; only admins can write.
-- ------------------------------------------------------------
create table if not exists public.global_settings (
    key         text primary key,
    value       jsonb not null default '{}'::jsonb,
    updated_at  timestamptz not null default now()
);

alter table public.global_settings enable row level security;

drop policy if exists "global_settings_read" on public.global_settings;
create policy "global_settings_read" on public.global_settings
    for select to authenticated
    using (true);

drop policy if exists "global_settings_admin_insert" on public.global_settings;
create policy "global_settings_admin_insert" on public.global_settings
    for insert to authenticated
    with check (
        exists (
            select 1 from public.profiles
            where auth_user_id = auth.uid() and role = 'admin'
        )
    );

drop policy if exists "global_settings_admin_update" on public.global_settings;
create policy "global_settings_admin_update" on public.global_settings
    for update to authenticated
    using (
        exists (
            select 1 from public.profiles
            where auth_user_id = auth.uid() and role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where auth_user_id = auth.uid() and role = 'admin'
        )
    );

-- ------------------------------------------------------------
-- Helper: is_current_user_admin()
-- Convenience RPC used by pages to show/hide admin-only UI.
-- ------------------------------------------------------------
create or replace function public.is_current_user_admin()
returns boolean as $$
    select exists(
        select 1 from public.profiles
        where auth_user_id = auth.uid() and role = 'admin'
    );
$$ language sql security definer stable;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- ------------------------------------------------------------
-- Seed global_settings rows so RLS reads never return empty unexpectedly.
-- ------------------------------------------------------------
insert into public.global_settings (key, value) values
    ('ai_config', '{"ai_api_url":"","ai_groq_key":"","ai_system_prompt":""}'::jsonb)
    on conflict (key) do nothing;
