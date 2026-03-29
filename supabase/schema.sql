-- Moo-tual Fund Database Schema
-- Run this in the Supabase SQL Editor to set up all tables

-- Households
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_code text not null unique,
  contact_info text,
  is_active boolean not null default true,
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
  name text not null,
  category text not null default 'other'
    check (category in ('steak','roast','mince','slow_cook','other','smoked')),
  est_weight_per_slot_kg numeric not null default 0,
  is_processable boolean not null default false,
  display_order int not null default 0,
  portions_per_slot int not null default 1
);

-- Prep options for processable cuts
create table if not exists public.prep_options (
  id uuid primary key default gen_random_uuid(),
  cut_id uuid not null references public.cuts(id) on delete cascade,
  label text not null,
  extra_cost numeric not null default 0,
  display_order int not null default 0
);

-- Per-slot cut allocations
create table if not exists public.slot_cuts (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  cut_id uuid not null references public.cuts(id) on delete cascade,
  portion_number int not null default 1,
  selected_prep_option_id uuid references public.prep_options(id) on delete set null,
  actual_weight_kg numeric,
  notes text
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

-- Seed initial cow status
insert into public.cow_status (stage, banner_message)
values ('purchased', 'Welcome to Moo-tual Fund! The steer has been purchased. Stay tuned for updates!')
on conflict do nothing;

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
  ('Chuck Roast', 'roast', 3.0, false, 6, 1),
  ('Blade Roast', 'roast', 2.5, false, 7, 1),
  ('Silverside', 'roast', 3.0, false, 8, 1),
  ('Topside', 'roast', 2.5, false, 9, 1),
  ('Osso Bucco', 'slow_cook', 2.0, false, 10, 1),
  ('Beef Cheeks', 'slow_cook', 1.0, false, 11, 1),
  ('Diced Beef', 'slow_cook', 2.0, false, 12, 1),
  ('Mince', 'mince', 3.0, true, 13, 3),
  ('Soup Bones', 'other', 2.0, false, 14, 1),
  ('Brisket', 'smoked', 3.0, false, 15, 1),
  ('Beef Ribs', 'smoked', 2.5, false, 16, 1)
on conflict do nothing;

-- Seed prep options for mince
insert into public.prep_options (cut_id, label, extra_cost, display_order)
select c.id, opt.label, opt.extra_cost, opt.display_order
from public.cuts c
cross join (values
  ('Raw Mince', 0, 1),
  ('Bolognaise (ready to heat)', 3, 2),
  ('Pesto Mince', 3, 3),
  ('Chilli Con Carne', 3, 4)
) as opt(label, extra_cost, display_order)
where c.name = 'Mince'
on conflict do nothing;

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

-- RLS policies: allow public read for most tables (data is meant to be transparent)
create policy "Public read cow_status" on public.cow_status for select using (true);
create policy "Public read slots" on public.slots for select using (true);
create policy "Public read cuts" on public.cuts for select using (true);
create policy "Public read prep_options" on public.prep_options for select using (true);
create policy "Public read slot_cuts" on public.slot_cuts for select using (true);
create policy "Public read expenses" on public.expenses for select using (true);
create policy "Public read payments" on public.payments for select using (true);
create policy "Public read households" on public.households for select using (true);
create policy "Public read suggestions" on public.suggestions for select using (true);

-- Write policies: service role handles all writes (admin operations go through server actions)
create policy "Service role write cow_status" on public.cow_status for all using (true) with check (true);
create policy "Service role write slots" on public.slots for all using (true) with check (true);
create policy "Service role write cuts" on public.cuts for all using (true) with check (true);
create policy "Service role write prep_options" on public.prep_options for all using (true) with check (true);
create policy "Service role write slot_cuts" on public.slot_cuts for all using (true) with check (true);
create policy "Service role write expenses" on public.expenses for all using (true) with check (true);
create policy "Service role write payments" on public.payments for all using (true) with check (true);
create policy "Service role write households" on public.households for all using (true) with check (true);
create policy "Service role write suggestions" on public.suggestions for all using (true) with check (true);
