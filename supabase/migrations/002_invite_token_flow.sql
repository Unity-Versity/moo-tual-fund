-- Add invite_token column for invite-link onboarding
alter table public.households
  add column if not exists invite_token text unique;

-- Backfill existing rows with a token
update public.households
  set invite_token = gen_random_uuid()::text
  where invite_token is null;

-- Make invite_token required going forward
alter table public.households
  alter column invite_token set not null,
  alter column invite_token set default gen_random_uuid()::text;

-- PIN is now set by the user, so allow null
alter table public.households
  alter column pin_code drop not null;

-- New households start as pending (inactive) until they set a PIN
alter table public.households
  alter column is_active set default false;
