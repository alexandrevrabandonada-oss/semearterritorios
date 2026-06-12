create table if not exists public.listening_record_mentioned_neighborhoods (
  id uuid primary key default gen_random_uuid(),
  listening_record_id uuid not null references public.listening_records(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete restrict,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listening_record_id, neighborhood_id)
);

create index if not exists listening_record_mentioned_neighborhoods_record_id_idx
on public.listening_record_mentioned_neighborhoods (listening_record_id);

create index if not exists listening_record_mentioned_neighborhoods_neighborhood_id_idx
on public.listening_record_mentioned_neighborhoods (neighborhood_id);

drop trigger if exists set_listening_record_mentioned_neighborhoods_updated_at
on public.listening_record_mentioned_neighborhoods;

create trigger set_listening_record_mentioned_neighborhoods_updated_at
before update on public.listening_record_mentioned_neighborhoods
for each row execute function public.set_updated_at();

alter table public.listening_record_mentioned_neighborhoods enable row level security;

drop policy if exists "Autenticados podem ler bairros citados em escutas"
on public.listening_record_mentioned_neighborhoods;
drop policy if exists "Autenticados não leitores podem vincular bairros citados"
on public.listening_record_mentioned_neighborhoods;
drop policy if exists "Equipe edita próprios bairros citados; admin e coordenação editam qualquer um"
on public.listening_record_mentioned_neighborhoods;
drop policy if exists "Equipe remove próprios bairros citados; admin e coordenação removem qualquer um"
on public.listening_record_mentioned_neighborhoods;

create policy "Autenticados podem ler bairros citados em escutas"
on public.listening_record_mentioned_neighborhoods for select to authenticated
using (true);

create policy "Autenticados não leitores podem vincular bairros citados"
on public.listening_record_mentioned_neighborhoods for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
);

create policy "Equipe edita próprios bairros citados; admin e coordenação editam qualquer um"
on public.listening_record_mentioned_neighborhoods for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (public.get_user_role() = 'equipe' and created_by = auth.uid())
)
with check (true);

create policy "Equipe remove próprios bairros citados; admin e coordenação removem qualquer um"
on public.listening_record_mentioned_neighborhoods for delete to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (public.get_user_role() = 'equipe' and created_by = auth.uid())
);
