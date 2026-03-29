-- Add is_admin flag to households
alter table public.households add column if not exists is_admin boolean not null default false;

-- Create your admin household entry
-- This PIN is what you'll enter to access the admin login
-- Change the PIN to whatever you want!
insert into public.households (name, pin_code, is_admin)
values ('Admin', '000000', true)
on conflict (pin_code) do update set is_admin = true;
