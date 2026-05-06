alter table public.public_transparency_snapshots
  add column if not exists generated_summary text,
  add column if not exists edited_summary text,
  add column if not exists methodology_notes text,
  add column if not exists opening_text text,
  add column if not exists listening_text text,
  add column if not exists limits_text text,
  add column if not exists next_steps_text text,
  add column if not exists review_checklist jsonb not null default '{}'::jsonb,
  add column if not exists last_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists last_edited_by uuid references public.profiles(id) on delete set null,
  add column if not exists last_edited_at timestamptz;

update public.public_transparency_snapshots
set
  generated_summary = coalesce(generated_summary, public_summary),
  edited_summary = coalesce(edited_summary, public_summary),
  methodology_notes = coalesce(methodology_notes, 'Síntese pública produzida a partir de dados revisados, agregados e sanitizados pela equipe SEMEAR.'),
  opening_text = coalesce(opening_text, 'Esta leitura pública apresenta apenas recortes agregados e aprovados pela coordenação.'),
  listening_text = coalesce(listening_text, public_summary),
  limits_text = coalesce(limits_text, 'Esta leitura não substitui o painel interno e não expõe falas originais, endereços ou dados pessoais.'),
  next_steps_text = coalesce(next_steps_text, 'As próximas publicações dependem de revisão humana, nova rodada de escutas e aprovação institucional.'),
  review_checklist = coalesce(review_checklist, '{}'::jsonb)
where true;

create or replace function public.transparency_review_checklist_complete(checklist jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce((checklist ->> 'no_raw_quote')::boolean, false)
    and coalesce((checklist ->> 'no_interviewer_name')::boolean, false)
    and coalesce((checklist ->> 'no_team_email')::boolean, false)
    and coalesce((checklist ->> 'no_cpf')::boolean, false)
    and coalesce((checklist ->> 'no_phone')::boolean, false)
    and coalesce((checklist ->> 'no_address')::boolean, false)
    and coalesce((checklist ->> 'no_health_data')::boolean, false)
    and coalesce((checklist ->> 'rare_occupations_grouped')::boolean, false)
    and coalesce((checklist ->> 'minimum_sample_respected')::boolean, false)
    and coalesce((checklist ->> 'sensitive_places_hidden')::boolean, false)
    and coalesce((checklist ->> 'reviewed_by_coordination')::boolean, false);
$$;

create or replace function public.guard_public_transparency_snapshot()
returns trigger
language plpgsql
as $$
declare
  text_blob text;
  content_changed boolean;
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
      or new.debrief_links is distinct from old.debrief_links;
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

drop trigger if exists guard_public_transparency_snapshot_before_write on public.public_transparency_snapshots;
create trigger guard_public_transparency_snapshot_before_write
before insert or update on public.public_transparency_snapshots
for each row execute function public.guard_public_transparency_snapshot();

drop policy if exists "Equipe cria somente rascunhos de snapshot" on public.public_transparency_snapshots;
drop policy if exists "Equipe revisa rascunhos proprios; coordenacao e admin publicam" on public.public_transparency_snapshots;

create policy "Equipe cria rascunho editorial de snapshot"
on public.public_transparency_snapshots for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
  and status = 'draft'
  and approved_by is null
  and approved_at is null
  and published_at is null
);

create policy "Equipe edita apenas rascunho proprio de snapshot"
on public.public_transparency_snapshots for update to authenticated
using (
  public.get_user_role() = 'equipe'
  and created_by = auth.uid()
  and status = 'draft'
)
with check (
  public.get_user_role() = 'equipe'
  and created_by = auth.uid()
  and status = 'draft'
  and approved_by is null
  and approved_at is null
  and published_at is null
);

create policy "Coordenacao e admin revisam e publicam snapshots"
on public.public_transparency_snapshots for update to authenticated
using (public.get_user_role() in ('admin', 'coordenacao'))
with check (public.get_user_role() in ('admin', 'coordenacao'));
