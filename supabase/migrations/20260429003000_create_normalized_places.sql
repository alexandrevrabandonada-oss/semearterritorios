create table if not exists public.normalized_places (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  normalized_name text not null,
  place_type text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'public_safe', 'sensitive')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.places_mentioned
add column if not exists normalized_place_id uuid references public.normalized_places(id) on delete set null;

create index if not exists normalized_places_neighborhood_id_idx on public.normalized_places (neighborhood_id);
create index if not exists normalized_places_name_idx on public.normalized_places (normalized_name);
create index if not exists normalized_places_visibility_idx on public.normalized_places (visibility);
create index if not exists places_mentioned_normalized_place_id_idx on public.places_mentioned (normalized_place_id);

drop trigger if exists set_normalized_places_updated_at on public.normalized_places;
create trigger set_normalized_places_updated_at
before update on public.normalized_places
for each row execute function public.set_updated_at();

alter table public.normalized_places enable row level security;

create policy "Autenticados podem ler lugares normalizados"
on public.normalized_places for select to authenticated
using (true);

create policy "Equipe, coordenação e admin podem criar lugares normalizados"
on public.normalized_places for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
);

create policy "Coordenação e admin editam lugares normalizados"
on public.normalized_places for update to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'))
with check (public.get_user_role() in ('admin', 'coordenacao'));
