-- ============================================================
-- Resort Manager — Accounts / Profiles schema (v2)
-- Run this in: Supabase Studio > SQL Editor
-- Idempotent: safe to re-run.
-- ============================================================

-- Required for crypt() and gen_salt() (usually preinstalled on Supabase)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Profiles table
-- ------------------------------------------------------------
create table if not exists public.profiles (
    id           uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique,
    email        text not null,
    full_name    text default '',
    role         text default 'editor' check (role in ('admin', 'editor', 'viewer')),
    created_at   timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
    on public.profiles for select
    to authenticated
    using (true);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
    on public.profiles for update
    to authenticated
    using (true)
    with check (true);

-- INSERT and DELETE intentionally not exposed via RLS.
-- All account creation/deletion goes through the SECURITY DEFINER
-- functions below, which atomically maintain
-- auth.users + auth.identities + profiles.
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

-- Drop legacy v1 function (replaced by admin_delete_account below).
drop function if exists public.delete_auth_user(uuid);

-- ------------------------------------------------------------
-- admin_create_account
-- Creates a fully functional account in one transaction:
--   1. auth.users (email already confirmed → user can sign in immediately)
--   2. auth.identities (required for email/password login)
--   3. public.profiles
-- Bypasses Supabase's signUp restrictions (email domain validation,
-- captcha, email confirmation, rate limits).
-- ------------------------------------------------------------
create or replace function public.admin_create_account(
    p_email     text,
    p_password  text,
    p_full_name text default '',
    p_role      text default 'editor'
)
returns uuid as $$
declare
    v_user_id uuid;
    v_email   text := lower(trim(p_email));
begin
    if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Invalid email address';
    end if;
    if length(p_password) < 6 then
        raise exception 'Password must be at least 6 characters';
    end if;
    if p_role not in ('admin', 'editor', 'viewer') then
        raise exception 'Invalid role: %', p_role;
    end if;
    if exists (select 1 from auth.users where email = v_email) then
        raise exception 'Email already exists';
    end if;

    v_user_id := gen_random_uuid();

    insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, confirmation_token, email_change,
        email_change_token_new, recovery_token
    ) values (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated',
        v_email, crypt(p_password, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false, '', '', '', ''
    );

    insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
    ) values (
        gen_random_uuid(), v_user_id,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', v_email,
            'email_verified', true
        ),
        'email', v_user_id::text,
        now(), now(), now()
    );

    insert into public.profiles (auth_user_id, email, full_name, role)
    values (v_user_id, v_email, coalesce(p_full_name, ''), p_role);

    return v_user_id;
end;
$$ language plpgsql security definer;

revoke all on function public.admin_create_account(text, text, text, text) from public;
grant execute on function public.admin_create_account(text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- admin_update_account
-- Updates profile fields (name, role) and optionally password.
-- Pass null for fields you don't want to change.
-- ------------------------------------------------------------
create or replace function public.admin_update_account(
    p_profile_id    uuid,
    p_full_name     text default null,
    p_role          text default null,
    p_new_password  text default null
)
returns void as $$
declare
    v_auth_id uuid;
begin
    select auth_user_id into v_auth_id from public.profiles where id = p_profile_id;
    if v_auth_id is null then
        raise exception 'Profile not found';
    end if;

    if p_role is not null and p_role not in ('admin', 'editor', 'viewer') then
        raise exception 'Invalid role: %', p_role;
    end if;

    update public.profiles
    set full_name = coalesce(p_full_name, full_name),
        role      = coalesce(p_role, role)
    where id = p_profile_id;

    if p_new_password is not null and length(p_new_password) > 0 then
        if length(p_new_password) < 6 then
            raise exception 'Password must be at least 6 characters';
        end if;
        update auth.users
        set encrypted_password = crypt(p_new_password, gen_salt('bf')),
            updated_at         = now()
        where id = v_auth_id;
    end if;
end;
$$ language plpgsql security definer;

revoke all on function public.admin_update_account(uuid, text, text, text) from public;
grant execute on function public.admin_update_account(uuid, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- admin_delete_account
-- Atomically removes the profile, auth.identities, and auth.users rows.
-- ------------------------------------------------------------
create or replace function public.admin_delete_account(p_profile_id uuid)
returns void as $$
declare
    v_auth_id uuid;
begin
    select auth_user_id into v_auth_id from public.profiles where id = p_profile_id;
    delete from public.profiles where id = p_profile_id;
    if v_auth_id is not null then
        delete from auth.identities where user_id = v_auth_id;
        delete from auth.users where id = v_auth_id;
    end if;
end;
$$ language plpgsql security definer;

revoke all on function public.admin_delete_account(uuid) from public;
grant execute on function public.admin_delete_account(uuid) to authenticated;
