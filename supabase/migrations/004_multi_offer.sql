-- ============================================================
-- Migration 004: Multi-Offer Platform
-- Transforms single-cow app into multi-offer group-buy platform
-- ============================================================

-- ── 1. Create new tables ─────────────────────────────────��──

-- Offers (replaces cow_status)
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  animal_type text not null default 'beef'
    check (animal_type in ('beef','lamb','pork','other')),
  animal_count int not null default 1 check (animal_count >= 1),
  share_size text not null default '1/8'
    check (share_size in ('1/2','1/4','1/8')),
  total_slots int not null generated always as (
    animal_count * case share_size
      when '1/2' then 2
      when '1/4' then 4
      when '1/8' then 8
    end
  ) stored,
  status text not null default 'open'
    check (status in ('draft','open','closed','complete')),
  stage text not null default 'purchased'
    check (stage in ('purchased','est_sacrifice','hanging','butchered','est_arrival','raw_pickup','smoked_pickup')),
  source_info text,
  banner_message text,
  est_sacrifice_date date,
  est_raw_pickup date,
  est_smoked_pickup date,
  weights_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per animal in an offer
create table if not exists public.offer_animals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  animal_number int not null check (animal_number >= 1),
  hanging_weight_kg numeric,
  total_take_home_kg numeric,
  unique (offer_id, animal_number)
);

-- Dynamic slots scoped to an offer and animal
create table if not exists public.offer_slots (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  animal_id uuid not null references public.offer_animals(id) on delete cascade,
  slot_number int not null check (slot_number >= 1),
  household_id uuid references public.households(id) on delete set null,
  is_claimed boolean not null default false,
  claimed_at timestamptz,
  unique (offer_id, slot_number)
);

-- Cuts scoped per-offer
create table if not exists public.offer_cuts (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  name text not null,
  category text not null default 'other'
    check (category in ('steak','roast','mince','slow_cook','other','smoked')),
  est_weight_per_slot_kg numeric not null default 0,
  is_processable boolean not null default false,
  display_order int not null default 0,
  portions_per_slot int not null default 1 check (portions_per_slot >= 1),
  unique (offer_id, name)
);

-- Prep options for offer cuts
create table if not exists public.offer_prep_options (
  id uuid primary key default gen_random_uuid(),
  offer_cut_id uuid not null references public.offer_cuts(id) on delete cascade,
  label text not null,
  extra_cost numeric not null default 0,
  display_order int not null default 0,
  unique (offer_cut_id, label)
);

-- Per-slot cut allocations (scoped to offer)
create table if not exists public.offer_slot_cuts (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.offer_slots(id) on delete cascade,
  cut_id uuid not null references public.offer_cuts(id) on delete cascade,
  portion_number int not null default 1,
  selected_prep_option_id uuid references public.offer_prep_options(id) on delete set null,
  actual_weight_kg numeric,
  notes text,
  unique (slot_id, cut_id, portion_number)
);

-- Template tables for reusable cut lists
create table if not exists public.cut_templates (
  id uuid primary key default gen_random_uuid(),
  animal_type text not null default 'beef',
  name text not null,
  category text not null default 'other'
    check (category in ('steak','roast','mince','slow_cook','other','smoked')),
  est_weight_per_slot_kg numeric not null default 0,
  is_processable boolean not null default false,
  display_order int not null default 0,
  portions_per_slot int not null default 1
);

create table if not exists public.prep_option_templates (
  id uuid primary key default gen_random_uuid(),
  cut_template_id uuid not null references public.cut_templates(id) on delete cascade,
  label text not null,
  extra_cost numeric not null default 0,
  display_order int not null default 0
);

-- ── 2. Migrate existing data ───────────────���────────────────

-- 2a. Create the first offer from cow_status
insert into public.offers (
  title, description, animal_type, animal_count, share_size,
  stage, banner_message, est_sacrifice_date, est_raw_pickup, est_smoked_pickup,
  weights_confirmed
)
select
  'April Beef Group Buy',
  'Whole steer sourced from a local farmer, butchered and prepped for your freezer.',
  'beef',
  2,
  '1/4',
  coalesce(stage, 'purchased'),
  banner_message,
  est_sacrifice_date,
  est_raw_pickup,
  est_smoked_pickup,
  (hanging_weight_kg is not null)
from public.cow_status
limit 1;

-- 2b. Create 2 offer_animals for the first offer
insert into public.offer_animals (offer_id, animal_number, hanging_weight_kg, total_take_home_kg)
select o.id, 1, cs.hanging_weight_kg, cs.total_take_home_kg
from public.offers o, public.cow_status cs
limit 1;

insert into public.offer_animals (offer_id, animal_number)
select o.id, 2
from public.offers o
limit 1;

-- 2c. Create 8 offer_slots (4 per animal)
-- Slots 1-4 for animal 1, slots 5-8 for animal 2
insert into public.offer_slots (offer_id, animal_id, slot_number)
select o.id, a.id, a.animal_number * 0 + gs.n
from public.offers o
cross join public.offer_animals a
cross join generate_series(1, 4) as gs(n)
where a.offer_id = o.id
order by a.animal_number, gs.n;

-- Fix slot_number: animal 1 gets 1-4, animal 2 gets 5-8
update public.offer_slots set slot_number = slot_number + 4
where animal_id = (
  select id from public.offer_animals where animal_number = 2 limit 1
);

-- 2d. Copy cuts to offer_cuts
insert into public.offer_cuts (offer_id, name, category, est_weight_per_slot_kg, is_processable, display_order, portions_per_slot)
select o.id, c.name, c.category, c.est_weight_per_slot_kg, c.is_processable, c.display_order, c.portions_per_slot
from public.offers o, public.cuts c;

-- 2e. Copy prep_options to offer_prep_options
insert into public.offer_prep_options (offer_cut_id, label, extra_cost, display_order)
select oc.id, po.label, po.extra_cost, po.display_order
from public.prep_options po
join public.cuts c on c.id = po.cut_id
join public.offer_cuts oc on oc.name = c.name
join public.offers o on o.id = oc.offer_id;

-- 2f. Copy cuts to cut_templates
insert into public.cut_templates (animal_type, name, category, est_weight_per_slot_kg, is_processable, display_order, portions_per_slot)
select 'beef', c.name, c.category, c.est_weight_per_slot_kg, c.is_processable, c.display_order, c.portions_per_slot
from public.cuts c;

-- 2g. Copy prep_options to prep_option_templates
insert into public.prep_option_templates (cut_template_id, label, extra_cost, display_order)
select ct.id, po.label, po.extra_cost, po.display_order
from public.prep_options po
join public.cuts c on c.id = po.cut_id
join public.cut_templates ct on ct.name = c.name and ct.animal_type = 'beef';

-- 2h. Add offer_id to expenses, payments, suggestions
alter table public.expenses add column if not exists offer_id uuid references public.offers(id) on delete set null;
alter table public.payments add column if not exists offer_id uuid references public.offers(id) on delete set null;
alter table public.suggestions add column if not exists offer_id uuid references public.offers(id) on delete set null;

-- Backfill existing records to the first offer
update public.expenses set offer_id = (select id from public.offers limit 1) where offer_id is null;
update public.payments set offer_id = (select id from public.offers limit 1) where offer_id is null;
update public.suggestions set offer_id = (select id from public.offers limit 1) where offer_id is null;

-- ── 3. Drop old tables ──────────────────────────────────────

-- Drop slot_cuts first (FK to slots and cuts)
drop table if exists public.slot_cuts cascade;
-- Drop slots (FK to households)
drop table if exists public.slots cascade;
-- Drop prep_options (FK to cuts)
drop table if exists public.prep_options cascade;
-- Drop cuts
drop table if exists public.cuts cascade;
-- Drop cow_status
drop table if exists public.cow_status cascade;

-- ── 4. Enable RLS on new tables ─────────────────────────────

alter table public.offers enable row level security;
alter table public.offer_animals enable row level security;
alter table public.offer_slots enable row level security;
alter table public.offer_cuts enable row level security;
alter table public.offer_prep_options enable row level security;
alter table public.offer_slot_cuts enable row level security;
alter table public.cut_templates enable row level security;
alter table public.prep_option_templates enable row level security;

-- Read policies (same pattern as before)
create policy "Anyone can read" on public.offers for select to anon, authenticated using (true);
create policy "Anyone can read" on public.offer_animals for select to anon, authenticated using (true);
create policy "Anyone can read" on public.offer_slots for select to anon, authenticated using (true);
create policy "Anyone can read" on public.offer_cuts for select to anon, authenticated using (true);
create policy "Anyone can read" on public.offer_prep_options for select to anon, authenticated using (true);
create policy "Anyone can read" on public.offer_slot_cuts for select to anon, authenticated using (true);
create policy "Anyone can read" on public.cut_templates for select to anon, authenticated using (true);
create policy "Anyone can read" on public.prep_option_templates for select to anon, authenticated using (true);
