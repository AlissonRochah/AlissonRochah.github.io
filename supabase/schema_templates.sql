-- ============================================================
-- Resort Manager — Section Types & Message Templates schema
-- Run this in: Supabase Studio > SQL Editor
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- Section types table
-- Canonical definitions, replacing hardcoded SECTION_TYPES arrays
-- previously duplicated across js/dashboard.js, extension/popup.js,
-- and scripts/build_seed.py.
-- ------------------------------------------------------------
create table if not exists public.section_types (
    id         uuid primary key default gen_random_uuid(),
    type       text unique not null,
    title      text not null,
    icon       text not null,
    sort_order int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.section_types enable row level security;

drop policy if exists "section_types_select" on public.section_types;
create policy "section_types_select"
    on public.section_types for select
    to authenticated
    using (true);

drop policy if exists "section_types_insert" on public.section_types;
create policy "section_types_insert"
    on public.section_types for insert
    to authenticated
    with check (true);

drop policy if exists "section_types_update" on public.section_types;
create policy "section_types_update"
    on public.section_types for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "section_types_delete" on public.section_types;
create policy "section_types_delete"
    on public.section_types for delete
    to authenticated
    using (true);

drop trigger if exists section_types_updated_at on public.section_types;
create trigger section_types_updated_at
    before update on public.section_types
    for each row execute function public.set_updated_at();

-- Seed canonical section types. Upsert so re-runs keep them in sync.
insert into public.section_types (type, title, icon, sort_order) values
    ('gate',       'Gate Access',         '🚪', 1),
    ('contacts',   'Contacts',            '☎️', 2),
    ('amenities',  'Community Amenities', '🏊', 3),
    ('pool',       'Pool',                '💧', 4),
    ('trash',      'Trash',               '🗑️', 5),
    ('parking',    'Parking',             '🅿️', 6),
    ('packages',   'Packages',            '📦', 7),
    ('pets',       'Pets',                '🐾', 8),
    ('ev',         'Electric Car',        '🔌', 9),
    ('additional', 'Additional Info',     'ℹ️', 10)
on conflict (type) do update set
    title      = excluded.title,
    icon       = excluded.icon,
    sort_order = excluded.sort_order;

-- ------------------------------------------------------------
-- Message templates
-- Reusable text blocks for generating guest messages.
-- The generator combines selected templates into a final message
-- (placeholders {guest} and {host} are replaced at generation time).
-- ------------------------------------------------------------
create table if not exists public.message_templates (
    id          uuid primary key default gen_random_uuid(),
    name        text unique not null,
    body        text not null default '',
    sort_order  int default 0,
    created_at  timestamptz default now(),
    updated_at  timestamptz default now(),
    updated_by  text
);

alter table public.message_templates enable row level security;

drop policy if exists "message_templates_select" on public.message_templates;
create policy "message_templates_select"
    on public.message_templates for select
    to authenticated
    using (true);

drop policy if exists "message_templates_insert" on public.message_templates;
create policy "message_templates_insert"
    on public.message_templates for insert
    to authenticated
    with check (true);

drop policy if exists "message_templates_update" on public.message_templates;
create policy "message_templates_update"
    on public.message_templates for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "message_templates_delete" on public.message_templates;
create policy "message_templates_delete"
    on public.message_templates for delete
    to authenticated
    using (true);

drop trigger if exists message_templates_updated_at on public.message_templates;
create trigger message_templates_updated_at
    before update on public.message_templates
    for each row execute function public.set_updated_at();
