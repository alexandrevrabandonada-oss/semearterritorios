create type public.action_status as enum (
  'planejada',
  'realizada',
  'reprogramada',
  'cancelada'
);

alter table public.actions
  add column objective text,
  add column team text,
  add column estimated_public integer check (estimated_public is null or estimated_public >= 0),
  add column summary text,
  add column status public.action_status not null default 'planejada';

create index actions_status_idx on public.actions (status);
create index actions_action_type_idx on public.actions (action_type);
