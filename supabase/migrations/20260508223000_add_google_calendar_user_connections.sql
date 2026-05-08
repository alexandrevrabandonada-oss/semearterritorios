-- Tijolo 058 - Adaptacao do Google Calendar para OAuth manual de usuario
--
-- Mantem o calendario institucional como destino, mas troca a autenticacao
-- da service account por conexao OAuth de coordenacao/admin quando necessario.

create table if not exists public.google_calendar_user_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  provider_user_email text null,
  provider_user_id text null,
  access_token text null,
  refresh_token text null,
  access_token_expires_at timestamptz null,
  scopes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_calendar_user_connections_profile_id_key unique (profile_id)
);

create index if not exists idx_google_calendar_user_connections_profile_id
  on public.google_calendar_user_connections (profile_id);

drop trigger if exists set_google_calendar_user_connections_updated_at
  on public.google_calendar_user_connections;

create trigger set_google_calendar_user_connections_updated_at
before update on public.google_calendar_user_connections
for each row execute function public.set_updated_at();

alter table public.google_calendar_user_connections enable row level security;

create policy "Admin e coordenacao leem propria conexao Google Calendar"
on public.google_calendar_user_connections
for select
to authenticated
using (
  profile_id = auth.uid()
  and public.get_user_role() in ('admin', 'coordenacao')
);

create policy "Admin e coordenacao inserem propria conexao Google Calendar"
on public.google_calendar_user_connections
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and public.get_user_role() in ('admin', 'coordenacao')
);

create policy "Admin e coordenacao atualizam propria conexao Google Calendar"
on public.google_calendar_user_connections
for update
to authenticated
using (
  profile_id = auth.uid()
  and public.get_user_role() in ('admin', 'coordenacao')
)
with check (
  profile_id = auth.uid()
  and public.get_user_role() in ('admin', 'coordenacao')
);

create policy "Admin e coordenacao removem propria conexao Google Calendar"
on public.google_calendar_user_connections
for delete
to authenticated
using (
  profile_id = auth.uid()
  and public.get_user_role() in ('admin', 'coordenacao')
);
