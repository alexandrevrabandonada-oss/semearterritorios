alter table public.public_transparency_snapshots
  add column if not exists current_risk_report jsonb not null default '{}'::jsonb;

create table if not exists public.public_transparency_snapshot_versions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.public_transparency_snapshots(id) on delete cascade,
  version_number integer not null,
  status_at_time text,
  title text,
  public_summary text,
  edited_summary text,
  privacy_notes text,
  totals jsonb not null default '{}'::jsonb,
  territory_summary jsonb not null default '[]'::jsonb,
  theme_summary jsonb not null default '[]'::jsonb,
  word_summary jsonb not null default '[]'::jsonb,
  action_timeline jsonb not null default '[]'::jsonb,
  review_checklist jsonb not null default '{}'::jsonb,
  risk_report jsonb not null default '{}'::jsonb,
  change_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (snapshot_id, version_number)
);

create table if not exists public.public_transparency_snapshot_review_comments (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.public_transparency_snapshots(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  comment text not null,
  comment_type text not null check (comment_type in ('privacidade', 'texto', 'metodologia', 'dados', 'aprovacao', 'publicacao', 'outro')),
  resolved boolean not null default false,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists public_transparency_snapshot_versions_snapshot_id_idx
on public.public_transparency_snapshot_versions (snapshot_id, version_number desc);

create index if not exists public_transparency_snapshot_review_comments_snapshot_id_idx
on public.public_transparency_snapshot_review_comments (snapshot_id, resolved, comment_type);

alter table public.public_transparency_snapshot_versions enable row level security;
alter table public.public_transparency_snapshot_review_comments enable row level security;

create policy "Autenticados leem versoes editoriais de snapshot"
on public.public_transparency_snapshot_versions for select to authenticated
using (true);

create policy "Coordenacao e admin criam versoes editoriais de snapshot"
on public.public_transparency_snapshot_versions for insert to authenticated
with check (public.get_user_role() in ('admin', 'coordenacao'));

create policy "Autenticados leem comentarios editoriais de snapshot"
on public.public_transparency_snapshot_review_comments for select to authenticated
using (true);

create policy "Equipe, coordenacao e admin comentam snapshots"
on public.public_transparency_snapshot_review_comments for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and author_id = auth.uid()
  and resolved = false
  and resolved_by is null
  and resolved_at is null
);

create policy "Coordenacao e admin resolvem comentarios editoriais"
on public.public_transparency_snapshot_review_comments for update to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'))
with check (public.get_user_role() in ('admin', 'coordenacao'));

create or replace function public.create_public_transparency_snapshot_version(
  p_snapshot_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_record public.public_transparency_snapshots%rowtype;
  next_version integer;
  inserted_id uuid;
begin
  select *
  into snapshot_record
  from public.public_transparency_snapshots
  where id = p_snapshot_id;

  if not found then
    raise exception 'Snapshot % não encontrado para versionamento.', p_snapshot_id;
  end if;

  select coalesce(max(version_number), 0) + 1
  into next_version
  from public.public_transparency_snapshot_versions
  where snapshot_id = p_snapshot_id;

  insert into public.public_transparency_snapshot_versions (
    snapshot_id,
    version_number,
    status_at_time,
    title,
    public_summary,
    edited_summary,
    privacy_notes,
    totals,
    territory_summary,
    theme_summary,
    word_summary,
    action_timeline,
    review_checklist,
    risk_report,
    change_reason,
    created_by
  )
  values (
    snapshot_record.id,
    next_version,
    snapshot_record.status,
    snapshot_record.title,
    snapshot_record.public_summary,
    snapshot_record.edited_summary,
    snapshot_record.privacy_notes,
    snapshot_record.totals,
    snapshot_record.territory_summary,
    snapshot_record.theme_summary,
    snapshot_record.word_summary,
    snapshot_record.action_timeline,
    snapshot_record.review_checklist,
    snapshot_record.current_risk_report,
    p_reason,
    auth.uid()
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.guard_public_transparency_snapshot()
returns trigger
language plpgsql
as $$
declare
  text_blob text;
  content_changed boolean;
  critical_pending_comments integer;
begin
  if new.generated_summary is null then
    new.generated_summary = new.public_summary;
  end if;

  if new.edited_summary is null then
    new.edited_summary = new.public_summary;
  end if;

  if new.methodology_notes is null then
    new.methodology_notes = 'Síntese pública produzida a partir de dados revisados, agregados e sanitizados pela equipe SEMEAR.';
  end if;

  if new.opening_text is null then
    new.opening_text = 'Esta leitura pública apresenta apenas recortes agregados e aprovados pela coordenação.';
  end if;

  if new.listening_text is null then
    new.listening_text = new.public_summary;
  end if;

  if new.limits_text is null then
    new.limits_text = 'Esta leitura não substitui o painel interno e não expõe falas originais, endereços ou dados pessoais.';
  end if;

  if new.next_steps_text is null then
    new.next_steps_text = 'As próximas publicações dependem de revisão humana, nova rodada de escutas e aprovação institucional.';
  end if;

  if TG_OP = 'INSERT' then
    content_changed = true;
  else
    content_changed =
      new.title is distinct from old.title
      or new.period_start is distinct from old.period_start
      or new.period_end is distinct from old.period_end
      or new.public_summary is distinct from old.public_summary
      or new.privacy_notes is distinct from old.privacy_notes
      or new.methodology_notes is distinct from old.methodology_notes
      or new.opening_text is distinct from old.opening_text
      or new.listening_text is distinct from old.listening_text
      or new.limits_text is distinct from old.limits_text
      or new.next_steps_text is distinct from old.next_steps_text
      or new.totals is distinct from old.totals
      or new.territory_summary is distinct from old.territory_summary
      or new.theme_summary is distinct from old.theme_summary
      or new.word_summary is distinct from old.word_summary
      or new.action_timeline is distinct from old.action_timeline
      or new.debrief_links is distinct from old.debrief_links
      or new.review_checklist is distinct from old.review_checklist
      or new.current_risk_report is distinct from old.current_risk_report;
  end if;

  if TG_OP = 'INSERT' or content_changed then
    new.last_edited_by = auth.uid();
    new.last_edited_at = now();
  end if;

  if new.public_summary is not null then
    new.edited_summary = new.public_summary;
  end if;

  if TG_OP = 'UPDATE' and old.status = 'published' and content_changed then
    new.status = 'reviewed';
    new.published_at = null;
    new.approved_by = null;
    new.approved_at = null;
  end if;

  if new.status = 'reviewed' and (TG_OP = 'INSERT' or new.status is distinct from old.status) then
    new.last_reviewed_by = auth.uid();
    new.last_reviewed_at = now();
  end if;

  if new.status = 'published' then
    if public.get_user_role() not in ('admin', 'coordenacao') then
      raise exception 'Apenas coordenação ou admin podem publicar snapshots.';
    end if;

    if not public.transparency_review_checklist_complete(new.review_checklist) then
      raise exception 'Checklist obrigatório de privacidade incompleto para publicação.';
    end if;

    select count(*)
    into critical_pending_comments
    from public.public_transparency_snapshot_review_comments
    where snapshot_id = new.id
      and resolved = false
      and comment_type in ('privacidade', 'dados', 'metodologia');

    if critical_pending_comments > 0 then
      raise exception 'Publicação bloqueada por comentários críticos pendentes.';
    end if;

    text_blob := lower(
      coalesce(new.title, '') || ' ' ||
      coalesce(new.public_summary, '') || ' ' ||
      coalesce(new.privacy_notes, '') || ' ' ||
      coalesce(new.methodology_notes, '') || ' ' ||
      coalesce(new.opening_text, '') || ' ' ||
      coalesce(new.listening_text, '') || ' ' ||
      coalesce(new.limits_text, '') || ' ' ||
      coalesce(new.next_steps_text, '')
    );

    if text_blob ~ '([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}\-?[0-9]{2})' then
      raise exception 'Publicação bloqueada por possível CPF.';
    end if;

    if text_blob ~ '([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})' then
      raise exception 'Publicação bloqueada por possível e-mail.';
    end if;

    if text_blob ~ '((\+?55\s?)?(\(?\d{2}\)?\s?)?(9?\d{4}\-?\d{4}))' then
      raise exception 'Publicação bloqueada por possível telefone.';
    end if;

    new.approved_by = coalesce(new.approved_by, auth.uid());
    new.approved_at = coalesce(new.approved_at, now());
    new.published_at = coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.audit_public_transparency_snapshot_version()
returns trigger
language plpgsql
as $$
declare
  reason text;
begin
  if TG_OP <> 'UPDATE' then
    return new;
  end if;

  if old.status = 'published' and new.status = 'reviewed' then
    reason := 'Snapshot publicado foi editado e retornou para reviewed.';
  elsif new.status = 'reviewed' and old.status is distinct from new.status then
    reason := 'Snapshot marcado como reviewed.';
  elsif new.status = 'approved' and old.status is distinct from new.status then
    reason := 'Snapshot aprovado.';
  elsif new.status = 'published' and old.status is distinct from new.status then
    reason := 'Snapshot publicado.';
  else
    return new;
  end if;

  perform public.create_public_transparency_snapshot_version(new.id, reason);
  return new;
end;
$$;

drop trigger if exists audit_public_transparency_snapshot_version_after_write on public.public_transparency_snapshots;
create trigger audit_public_transparency_snapshot_version_after_write
after update on public.public_transparency_snapshots
for each row execute function public.audit_public_transparency_snapshot_version();
