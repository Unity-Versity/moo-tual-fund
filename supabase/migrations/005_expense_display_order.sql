-- Add display_order to expenses for admin reordering
alter table public.expenses add column if not exists display_order integer not null default 0;

-- Backfill existing rows: order by created_at
with numbered as (
  select id, row_number() over (partition by offer_id order by created_at) as rn
  from public.expenses
)
update public.expenses e
set display_order = n.rn
from numbered n
where e.id = n.id;
