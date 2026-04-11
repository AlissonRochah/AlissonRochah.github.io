-- ============================================================
-- Resort Manager — Supabase schema
-- Run this in: Supabase Studio > SQL Editor
-- ============================================================

-- Table
create table if not exists public.resorts (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    aliases     text[] default '{}',
    address     text,
    gate_code   text,
    sections    jsonb not null default '[]'::jsonb,
    updated_at  timestamptz default now(),
    updated_by  text
);

-- Indexes to speed up search / alias lookup from the extension
create index if not exists resorts_name_idx
    on public.resorts using gin (to_tsvector('simple', name));

create index if not exists resorts_aliases_idx
    on public.resorts using gin (aliases);

-- Auto-update updated_at on every row update
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists resorts_updated_at on public.resorts;
create trigger resorts_updated_at
    before update on public.resorts
    for each row execute function public.set_updated_at();

-- Row Level Security: any authenticated user can read/write.
-- (Tighten later to an admin-only role.)
alter table public.resorts enable row level security;

drop policy if exists "resorts_select" on public.resorts;
create policy "resorts_select"
    on public.resorts for select
    to authenticated
    using (true);

drop policy if exists "resorts_insert" on public.resorts;
create policy "resorts_insert"
    on public.resorts for insert
    to authenticated
    with check (true);

drop policy if exists "resorts_update" on public.resorts;
create policy "resorts_update"
    on public.resorts for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "resorts_delete" on public.resorts;
create policy "resorts_delete"
    on public.resorts for delete
    to authenticated
    using (true);
