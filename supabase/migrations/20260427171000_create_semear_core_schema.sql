create extension if not exists "pgcrypto";

create type public.source_type as enum (
  'feira',
  'cras',
  'escola',
  'praca',
  'roda',
  'oficina',
  'caminhada',
  'outro'
);

create type public.review_status as enum (
  'draft',
  'reviewed'
);

create type public.action_type as enum (
  'banca_escuta',
  'roda',
  'oficina',
  'caminhada',
  'reuniao_institucional',
  'devolutiva',
  'outro'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'equipe' check (role in ('equipe', 'coordenacao', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  action_type public.action_type not null default 'outro',
  action_date date not null,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  location_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.listening_records (
  id uuid primary key default gen_random_uuid(),
  action_id uuid references public.actions(id) on delete set null,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  date date not null,
  source_type public.source_type not null default 'outro',
  interviewer_name text not null,
  approximate_age_range text,
  free_speech_text text not null,
  team_summary text,
  words_used text,
  places_mentioned_text text,
  priority_mentioned text,
  unexpected_notes text,
  review_status public.review_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.listening_record_themes (
  id uuid primary key default gen_random_uuid(),
  listening_record_id uuid not null references public.listening_records(id) on delete cascade,
  theme_id uuid not null references public.themes(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (listening_record_id, theme_id)
);

create table public.places_mentioned (
  id uuid primary key default gen_random_uuid(),
  listening_record_id uuid not null references public.listening_records(id) on delete cascade,
  neighborhood_id uuid references public.neighborhoods(id) on delete set null,
  place_name text not null,
  place_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  reference_month date not null,
  title text not null,
  free_speech_highlights text,
  team_analysis text,
  recurring_themes text,
  territorial_notes text,
  review_status public.review_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (reference_month)
);

create index neighborhoods_name_idx on public.neighborhoods (name);
create index actions_action_date_idx on public.actions (action_date);
create index actions_neighborhood_id_idx on public.actions (neighborhood_id);
create index listening_records_date_idx on public.listening_records (date);
create index listening_records_action_id_idx on public.listening_records (action_id);
create index listening_records_neighborhood_id_idx on public.listening_records (neighborhood_id);
create index listening_records_review_status_idx on public.listening_records (review_status);
create index themes_name_idx on public.themes (name);
create index listening_record_themes_record_id_idx on public.listening_record_themes (listening_record_id);
create index listening_record_themes_theme_id_idx on public.listening_record_themes (theme_id);
create index places_mentioned_record_id_idx on public.places_mentioned (listening_record_id);
create index monthly_reports_reference_month_idx on public.monthly_reports (reference_month);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_neighborhoods_updated_at
before update on public.neighborhoods
for each row execute function public.set_updated_at();

create trigger set_actions_updated_at
before update on public.actions
for each row execute function public.set_updated_at();

create trigger set_listening_records_updated_at
before update on public.listening_records
for each row execute function public.set_updated_at();

create trigger set_themes_updated_at
before update on public.themes
for each row execute function public.set_updated_at();

create trigger set_listening_record_themes_updated_at
before update on public.listening_record_themes
for each row execute function public.set_updated_at();

create trigger set_places_mentioned_updated_at
before update on public.places_mentioned
for each row execute function public.set_updated_at();

create trigger set_monthly_reports_updated_at
before update on public.monthly_reports
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.actions enable row level security;
alter table public.listening_records enable row level security;
alter table public.themes enable row level security;
alter table public.listening_record_themes enable row level security;
alter table public.places_mentioned enable row level security;
alter table public.monthly_reports enable row level security;

create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Authenticated users can read neighborhoods"
on public.neighborhoods for select
to authenticated
using (true);

create policy "Authenticated users can create neighborhoods"
on public.neighborhoods for insert
to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can update neighborhoods"
on public.neighborhoods for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read actions"
on public.actions for select
to authenticated
using (true);

create policy "Authenticated users can create actions"
on public.actions for insert
to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can update actions"
on public.actions for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read listening records"
on public.listening_records for select
to authenticated
using (true);

create policy "Authenticated users can create listening records"
on public.listening_records for insert
to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can update listening records"
on public.listening_records for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read themes"
on public.themes for select
to authenticated
using (true);

create policy "Authenticated users can create themes"
on public.themes for insert
to authenticated
with check (created_by = auth.uid() or created_by is null);

create policy "Authenticated users can update themes"
on public.themes for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read listening record themes"
on public.listening_record_themes for select
to authenticated
using (true);

create policy "Authenticated users can create listening record themes"
on public.listening_record_themes for insert
to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can update listening record themes"
on public.listening_record_themes for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read places mentioned"
on public.places_mentioned for select
to authenticated
using (true);

create policy "Authenticated users can create places mentioned"
on public.places_mentioned for insert
to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can update places mentioned"
on public.places_mentioned for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can read monthly reports"
on public.monthly_reports for select
to authenticated
using (true);

create policy "Authenticated users can create monthly reports"
on public.monthly_reports for insert
to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can update monthly reports"
on public.monthly_reports for update
to authenticated
using (true)
with check (true);

insert into public.themes (name, description)
values
  ('ar/poluição', 'Menções sobre qualidade do ar, fumaça, fuligem ou poluição.'),
  ('pó/sujeira', 'Menções sobre pó, sujeira acumulada ou resíduos no cotidiano.'),
  ('saúde', 'Menções coletivas sobre saúde e bem-estar sem dados individuais identificáveis.'),
  ('calor', 'Menções sobre calor, sensação térmica ou desconforto ambiental.'),
  ('árvores/sombra', 'Menções sobre arborização, sombra, praças e conforto ambiental.'),
  ('água/rio', 'Menções sobre água, rios, córregos, enchentes ou drenagem.'),
  ('lixo/resíduos', 'Menções sobre lixo, descarte, coleta e resíduos.'),
  ('abandono', 'Menções sobre abandono, falta de cuidado ou ausência de manutenção.'),
  ('poder público', 'Menções sobre prefeitura, Estado, serviços públicos ou políticas públicas.'),
  ('empresas', 'Menções sobre empresas, atividade econômica e responsabilidades privadas.'),
  ('qualidade de vida', 'Menções amplas sobre bem-estar, cotidiano e condições de vida.'),
  ('não percebe problema', 'Registro quando a pessoa não identifica problema no tema perguntado.'),
  ('inesperado/outro', 'Tema aberto para falas que não cabem nos marcadores iniciais.')
on conflict (name) do nothing;
