-- Status operacional não é prova de revisão nem de realização. Não há backfill:
-- a confirmação histórica sem evidência permanece desconhecida.
alter table public.listening_records add column human_reviewed_at timestamptz,
  add column human_reviewed_by uuid references public.profiles(id);
alter table public.actions add column occurrence_confirmed_at timestamptz,
  add column occurrence_confirmed_by uuid references public.profiles(id);

create table public.methodology_confirmation_events (
  id bigint generated always as identity primary key,
  object_type text not null check (object_type in ('listening_record', 'action')),
  object_id uuid not null,
  event_type text not null check (event_type in ('confirmed', 'invalidated')),
  actor_id uuid references public.profiles(id),
  occurred_at timestamptz not null default now()
);
alter table public.methodology_confirmation_events enable row level security;
revoke all on public.methodology_confirmation_events from public, anon, authenticated;
grant select on public.methodology_confirmation_events to authenticated;
create policy methodology_events_admin_read on public.methodology_confirmation_events
  for select to authenticated using (public.get_user_role() in ('admin', 'coordenacao'));

-- Clientes não podem escrever a identidade ou o horário de confirmação.
-- As funções de confirmação e os gatilhos executam com o proprietário da migração.
create function public.protect_methodology_confirmation_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_table_name = 'listening_records' then
      if (tg_op = 'INSERT' and (new.human_reviewed_at is not null or new.human_reviewed_by is not null))
        or (tg_op = 'UPDATE' and (new.human_reviewed_at, new.human_reviewed_by) is distinct from (old.human_reviewed_at, old.human_reviewed_by)) then
        raise exception 'Confirmação de revisão deve usar a operação própria';
      end if;
    else
      if (tg_op = 'INSERT' and (new.occurrence_confirmed_at is not null or new.occurrence_confirmed_by is not null))
        or (tg_op = 'UPDATE' and (new.occurrence_confirmed_at, new.occurrence_confirmed_by) is distinct from (old.occurrence_confirmed_at, old.occurrence_confirmed_by)) then
        raise exception 'Confirmação de realização deve usar a operação própria';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger a_protect_listening_confirmation before insert or update on public.listening_records
for each row execute function public.protect_methodology_confirmation_fields();
create trigger a_protect_action_confirmation before insert or update on public.actions
for each row execute function public.protect_methodology_confirmation_fields();

create function public.invalidate_methodology_confirmation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare kind text; was_confirmed boolean;
begin
  if tg_table_name = 'listening_records' then
    kind := 'listening_record'; was_confirmed := old.human_reviewed_at is not null;
    if (to_jsonb(new) - array['updated_at','human_reviewed_at','human_reviewed_by']) is distinct from
       (to_jsonb(old) - array['updated_at','human_reviewed_at','human_reviewed_by']) then
      new.human_reviewed_at := null; new.human_reviewed_by := null;
    end if;
    if was_confirmed and new.human_reviewed_at is null then
      insert into public.methodology_confirmation_events(object_type, object_id, event_type, actor_id)
        values (kind, old.id, 'invalidated', auth.uid());
    elsif new.human_reviewed_at is not null and (new.human_reviewed_at, new.human_reviewed_by) is distinct from (old.human_reviewed_at, old.human_reviewed_by) then
      insert into public.methodology_confirmation_events(object_type, object_id, event_type, actor_id)
        values (kind, old.id, 'confirmed', auth.uid());
    end if;
  else
    kind := 'action'; was_confirmed := old.occurrence_confirmed_at is not null;
    if (to_jsonb(new) - array['updated_at','occurrence_confirmed_at','occurrence_confirmed_by']) is distinct from
       (to_jsonb(old) - array['updated_at','occurrence_confirmed_at','occurrence_confirmed_by']) then
      new.occurrence_confirmed_at := null; new.occurrence_confirmed_by := null;
    end if;
    if was_confirmed and new.occurrence_confirmed_at is null then
      insert into public.methodology_confirmation_events(object_type, object_id, event_type, actor_id)
        values (kind, old.id, 'invalidated', auth.uid());
    elsif new.occurrence_confirmed_at is not null and (new.occurrence_confirmed_at, new.occurrence_confirmed_by) is distinct from (old.occurrence_confirmed_at, old.occurrence_confirmed_by) then
      insert into public.methodology_confirmation_events(object_type, object_id, event_type, actor_id)
        values (kind, old.id, 'confirmed', auth.uid());
    end if;
  end if;
  return new;
end $$;
create trigger z_invalidate_listening_confirmation before update on public.listening_records
for each row execute function public.invalidate_methodology_confirmation();
create trigger z_invalidate_action_confirmation before update on public.actions
for each row execute function public.invalidate_methodology_confirmation();

create function public.invalidate_linked_listening_confirmation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    update public.listening_records set human_reviewed_at = null, human_reviewed_by = null
      where id = old.listening_record_id and human_reviewed_at is not null;
  end if;
  if tg_op <> 'DELETE' then
    update public.listening_records set human_reviewed_at = null, human_reviewed_by = null
      where id = new.listening_record_id and human_reviewed_at is not null;
  end if;
  return null;
end $$;
create trigger invalidate_theme_confirmation after insert or update or delete on public.listening_record_themes
for each row execute function public.invalidate_linked_listening_confirmation();
create trigger invalidate_place_confirmation after insert or update or delete on public.places_mentioned
for each row execute function public.invalidate_linked_listening_confirmation();
create trigger invalidate_neighborhood_confirmation after insert or update or delete on public.listening_record_mentioned_neighborhoods
for each row execute function public.invalidate_linked_listening_confirmation();

create function public.invalidate_reviews_after_action_type_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.action_type is distinct from old.action_type then
    update public.listening_records set human_reviewed_at = null, human_reviewed_by = null
      where action_id = new.id and human_reviewed_at is not null;
  end if;
  return null;
end $$;
create trigger invalidate_reviews_when_action_type_changes after update on public.actions
for each row execute function public.invalidate_reviews_after_action_type_change();

create function public.confirm_listening_review(p_record_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(public.get_user_role(), '') not in ('admin', 'coordenacao', 'equipe') then
    raise exception 'Usuário não autorizado';
  end if;
  update public.listening_records set human_reviewed_at = now(), human_reviewed_by = auth.uid()
    where id = p_record_id and (public.get_user_role() in ('admin', 'coordenacao') or created_by = auth.uid());
  if not found then raise exception 'Escuta não encontrada ou sem permissão'; end if;
end $$;
create function public.confirm_action_occurrence(p_action_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(public.get_user_role(), '') not in ('admin', 'coordenacao', 'equipe') then
    raise exception 'Usuário não autorizado';
  end if;
  update public.actions set occurrence_confirmed_at = now(), occurrence_confirmed_by = auth.uid()
    where id = p_action_id and status = 'realizada' and (public.get_user_role() in ('admin', 'coordenacao') or created_by = auth.uid());
  if not found then raise exception 'Ação não encontrada, não realizada ou sem permissão'; end if;
end $$;
revoke all on function public.confirm_listening_review(uuid) from public, anon;
revoke all on function public.confirm_action_occurrence(uuid) from public, anon;
grant execute on function public.confirm_listening_review(uuid) to authenticated;
grant execute on function public.confirm_action_occurrence(uuid) to authenticated;
revoke all on function public.protect_methodology_confirmation_fields() from public, anon, authenticated;
revoke all on function public.invalidate_methodology_confirmation() from public, anon, authenticated;
revoke all on function public.invalidate_linked_listening_confirmation() from public, anon, authenticated;
revoke all on function public.invalidate_reviews_after_action_type_change() from public, anon, authenticated;

