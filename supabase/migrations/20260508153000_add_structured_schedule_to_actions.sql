-- Tijolo 055 - Horários estruturados em ações
--
-- Mantém compatibilidade com action_date legado, mas passa a permitir
-- período detalhado para agenda operacional e futura sincronização externa.

alter table public.actions
  add column if not exists starts_at timestamptz null,
  add column if not exists ends_at timestamptz null,
  add column if not exists all_day boolean not null default false;

create index if not exists idx_actions_starts_at on public.actions (starts_at asc);
create index if not exists idx_actions_ends_at on public.actions (ends_at asc);

alter table public.actions
  drop constraint if exists actions_schedule_consistency_check;

alter table public.actions
  add constraint actions_schedule_consistency_check
  check (ends_at is null or starts_at is null or ends_at >= starts_at);
