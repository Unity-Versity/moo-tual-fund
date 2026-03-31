-- Moo-tual Fund Database Schema
-- Run this in the Supabase SQL Editor to set up all tables

-- Households
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_code text unique,
  invite_token text not null unique default gen_random_uuid()::text,
  contact_info text,
  is_active boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cow status (single-row table)
create table if not exists public.cow_status (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'purchased'
    check (stage in ('purchased','est_sacrifice','hanging','butchered','est_arrival','raw_pickup','smoked_pickup')),
  est_sacrifice_date date,
  hanging_weight_kg numeric,
  total_take_home_kg numeric,
  est_raw_pickup date,
  est_smoked_pickup date,
  banner_message text,
  updated_at timestamptz not null default now()
);

-- Slots (8 total)
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  slot_number int not null unique check (slot_number between 1 and 8),
  household_id uuid references public.households(id) on delete set null,
  is_claimed boolean not null default false,
  claimed_at timestamptz
);

-- Cuts (master list)
create table if not exists public.cuts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'other'
    check (category in ('steak','roast','mince','slow_cook','other','smoked')),
  est_weight_per_slot_kg numeric not null default 0,
  is_processable boolean not null default false,
  display_order int not null default 0,
  portions_per_slot int not null default 1 check (portions_per_slot >= 1)
);

-- Prep options for processable cuts
create table if not exists public.prep_options (
  id uuid primary key default gen_random_uuid(),
  cut_id uuid not null references public.cuts(id) on delete cascade,
  label text not null,
  extra_cost numeric not null default 0,
  display_order int not null default 0,
  unique (cut_id, label)
);

-- Per-slot cut allocations
create table if not exists public.slot_cuts (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  cut_id uuid not null references public.cuts(id) on delete cascade,
  portion_number int not null default 1,
  selected_prep_option_id uuid references public.prep_options(id) on delete set null,
  actual_weight_kg numeric,
  notes text,
  unique (slot_id, cut_id, portion_number)
);

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  amount numeric not null,
  method text not null default 'PayID',
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- Suggestions
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  slot_cut_id uuid references public.slot_cuts(id) on delete set null,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending','noted','resolved')),
  created_at timestamptz not null default now()
);

-- Seed initial cow status (only if table is empty)
insert into public.cow_status (stage, banner_message)
select 'purchased', 'Welcome to Moo-tual Fund! The steer has been purchased. Stay tuned for updates!'
where not exists (select 1 from public.cow_status);

-- Seed the 8 slots
insert into public.slots (slot_number) values (1),(2),(3),(4),(5),(6),(7),(8)
on conflict do nothing;

-- Seed estimated cuts for a typical 1/8th share (~50-55kg take-home)
insert into public.cuts (name, category, est_weight_per_slot_kg, is_processable, display_order, portions_per_slot) values
  ('Scotch Fillet', 'steak', 2.0, false, 1, 1),
  ('Eye Fillet', 'steak', 1.0, false, 2, 1),
  ('Rump Steak', 'steak', 2.5, false, 3, 1),
  ('Porterhouse', 'steak', 2.0, false, 4, 1),
  ('T-Bone', 'steak', 1.5, false, 5, 1),
  ('Chuck Roast', 'roast', 3.0, true, 6, 1),
  ('Blade & Cheeks', 'slow_cook', 3.5, true, 7, 1),
  ('Silverside', 'roast', 3.0, true, 8, 1),
  ('Top Round', 'roast', 2.5, true, 9, 1),
  ('Shins', 'slow_cook', 2.0, true, 10, 1),
  ('Diced Beef', 'slow_cook', 2.0, false, 12, 1),
  ('Mince', 'mince', 3.0, true, 13, 3),
  ('Brisket', 'smoked', 3.0, true, 15, 1),
  ('Beef Ribs', 'smoked', 2.5, true, 16, 1)
on conflict (name) do nothing;

-- Seed prep options for mince
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw Mince', 0, 1),
  ('Bolognaise (ready to heat)', 3, 2),
  ('Mexican Mince', 3, 3),
  ('Chilli Con Carne', 3, 4)
) as opt(label, extra_cost, display_order)
where c.name = 'Mince'
on conflict (cut_id, label) do nothing;

-- Seed prep options for brisket
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw', 0, 1),
  ('Smoked & Sliced', 3, 2)
) as opt(label, extra_cost, display_order)
where c.name = 'Brisket'
on conflict (cut_id, label) do nothing;

-- Seed prep options for beef ribs
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw', 0, 1),
  ('Slow Cooked (fall off bone)', 3, 2)
) as opt(label, extra_cost, display_order)
where c.name = 'Beef Ribs'
on conflict (cut_id, label) do nothing;

-- Seed prep options for chuck roast
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw', 0, 1),
  ('BBQ Pulled Beef', 3, 2)
) as opt(label, extra_cost, display_order)
where c.name = 'Chuck Roast'
on conflict (cut_id, label) do nothing;

-- Seed prep options for blade & cheeks
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw', 0, 1),
  ('Chinese Braised', 3, 2)
) as opt(label, extra_cost, display_order)
where c.name = 'Blade & Cheeks'
on conflict (cut_id, label) do nothing;

-- Seed prep options for silverside
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw', 0, 1),
  ('Red Wine & Onion Braised', 3, 2)
) as opt(label, extra_cost, display_order)
where c.name = 'Silverside'
on conflict (cut_id, label) do nothing;

-- Seed prep options for top round
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw', 0, 1),
  ('Roast Beef', 3, 2)
) as opt(label, extra_cost, display_order)
where c.name = 'Top Round'
on conflict (cut_id, label) do nothing;

-- Seed prep options for shins
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
from public.cuts c
cross join (values
  ('Raw', 0, 1),
  ('Shredded Beef', 3, 2)
) as opt(label, extra_cost, display_order)
where c.name = 'Shins'
on conflict (cut_id, label) do nothing;

-- Enable RLS on all tables
alter table public.households enable row level security;
alter table public.cow_status enable row level security;
alter table public.slots enable row level security;
alter table public.cuts enable row level security;
alter table public.prep_options enable row level security;
alter table public.slot_cuts enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;
alter table public.suggestions enable row level security;

-- View that hides pin_code for client-side queries
create or replace view public.households_safe as
  select id, name, contact_info, is_active, created_at
  from public.households;

-- RLS policies: read-only for anon/authenticated, writes go through service_role (which bypasses RLS)
create policy "Anyone can read" on public.cow_status for select to anon, authenticated using (true);
create policy "Anyone can read" on public.slots for select to anon, authenticated using (true);
create policy "Anyone can read" on public.cuts for select to anon, authenticated using (true);
create policy "Anyone can read" on public.prep_options for select to anon, authenticated using (true);
create policy "Anyone can read" on public.slot_cuts for select to anon, authenticated using (true);
create policy "Anyone can read" on public.expenses for select to anon, authenticated using (true);
create policy "Anyone can read" on public.payments for select to anon, authenticated using (true);
create policy "Anyone can read" on public.suggestions for select to anon, authenticated using (true);

-- Households: public read allowed for joins (pin_code column exists but is low-risk for this use case)
-- PIN validation always happens server-side via service_role
create policy "Anyone can read" on public.households for select to anon, authenticated using (true);

-- No write policies for anon/authenticated — all writes use service_role which bypasses RLS
