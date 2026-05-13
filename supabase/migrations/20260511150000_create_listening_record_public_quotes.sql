create table if not exists public.listening_record_public_quotes (
  id uuid primary key default gen_random_uuid(),
  listening_record_id uuid not null references public.listening_records(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  quote_text text not null,
  sanitized_text text null,
  theme_label text null,
  context_note text null,
  status text not null default 'draft' check (status in ('draft', 'needs_review', 'approved_internal', 'approved_public', 'rejected', 'archived')),
  sensitive_risk boolean not null default false,
  risk_notes text null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  approved_by uuid null references public.profiles(id) on delete set null,
  approved_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listening_record_public_quotes_action_id_idx
on public.listening_record_public_quotes (action_id, status);

create index if not exists listening_record_public_quotes_record_id_idx
on public.listening_record_public_quotes (listening_record_id);

create index if not exists listening_record_public_quotes_status_idx
on public.listening_record_public_quotes (status);

create or replace function public.public_quote_has_critical_risk(p_text text)
returns boolean
language sql
immutable
as $$
  select (
    coalesce(p_text, '') ~ '\\m\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{2}\\M'
    or coalesce(p_text, '') ~ '\\m(?:\\+?55\\s?)?(?:\\(?\\d{2}\\)?\\s?)?\\d{4,5}[-.\\s]?\\d{4}\\M'
    or coalesce(p_text, '') ~* '\\m[\\w.%+-]+@[\\w.-]+\\.[a-z]{2,}\\M'
    or coalesce(p_text, '') ~ '\\m\\d{5}[-\\s]?\\d{3}\\M'
    or coalesce(p_text, '') ~* '\\m(?:rua|avenida|av\\.?|travessa|alameda|beco|estrada|rodovia)\\s+[^,.;\\n]{2,}(?:,|\\s+n[ºo]?\\s*|\\s+numero\\s+)\\d+'
    or coalesce(p_text, '') ~* '\\m(?:moro|minha casa|minha residencia|minha residência|minha moradia)\\M[^.\\n]{0,80}(?:rua|avenida|av\\.?|travessa|alameda|numero|n[ºo]?|cep)'
  );
$$;

create or replace function public.apply_public_quote_workflow_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_text text;
  source_action_id uuid;
begin
  select lr.action_id into source_action_id
  from public.listening_records lr
  where lr.id = new.listening_record_id;

  if source_action_id is null or source_action_id <> new.action_id then
    raise exception 'action_id da fala deve corresponder ao action_id da escuta.';
  end if;

  base_text := coalesce(nullif(trim(new.sanitized_text), ''), trim(new.quote_text));

  if tg_op = 'UPDATE' then
    if coalesce(old.sanitized_text, '') <> coalesce(new.sanitized_text, '')
      and old.status in ('approved_internal', 'approved_public')
    then
      new.status := 'needs_review';
      new.approved_by := null;
      new.approved_at := null;
    end if;
  end if;

  new.sensitive_risk := public.public_quote_has_critical_risk(base_text);

  if new.sensitive_risk then
    new.risk_notes := coalesce(new.risk_notes, 'Detector encontrou risco critico de dado pessoal.');
  end if;

  if new.status in ('approved_internal', 'approved_public') then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;

  if new.status = 'approved_public' then
    if public.get_user_role() not in ('admin', 'coordenacao') then
      raise exception 'Apenas coordenação/admin podem aprovar fala pública.';
    end if;

    if new.sanitized_text is null or btrim(new.sanitized_text) = '' then
      raise exception 'approved_public exige sanitized_text preenchido.';
    end if;

    if new.sensitive_risk then
      raise exception 'approved_public bloqueado por risco crítico de privacidade.';
    end if;

    new.approved_by := coalesce(new.approved_by, auth.uid());
    new.approved_at := coalesce(new.approved_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists set_listening_record_public_quotes_updated_at on public.listening_record_public_quotes;
create trigger set_listening_record_public_quotes_updated_at
before update on public.listening_record_public_quotes
for each row execute function public.set_updated_at();

drop trigger if exists apply_public_quote_workflow_guard on public.listening_record_public_quotes;
create trigger apply_public_quote_workflow_guard
before insert or update on public.listening_record_public_quotes
for each row execute function public.apply_public_quote_workflow_guard();

alter table public.listening_record_public_quotes enable row level security;

create policy "Anon sem acesso falas publicas internas"
on public.listening_record_public_quotes for all to anon
using (false)
with check (false);

create policy "Perfis autorizados leem falas candidatas"
on public.listening_record_public_quotes for select to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and exists (
    select 1
    from public.listening_records lr
    where lr.id = listening_record_public_quotes.listening_record_id
      and lr.action_id = listening_record_public_quotes.action_id
  )
);

create policy "Equipe sugere falas em draft ou revisao"
on public.listening_record_public_quotes for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
  and (
    (public.get_user_role() = 'equipe' and status in ('draft', 'needs_review'))
    or public.get_user_role() in ('admin', 'coordenacao')
  )
);

create policy "Equipe edita falas proprias abertas"
on public.listening_record_public_quotes for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status in ('draft', 'needs_review', 'rejected')
  )
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and status in ('draft', 'needs_review', 'rejected')
  )
);

create policy "Coordenacao e admin podem arquivar falas"
on public.listening_record_public_quotes for delete to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'));
