create or replace function public.block_conversation_circle_public_quote_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_source_type text;
  action_type_value text;
begin
  if new.status not in ('approved_internal', 'approved_public') then
    return new;
  end if;

  select lr.source_type::text, a.action_type::text
    into record_source_type, action_type_value
  from public.listening_records lr
  left join public.actions a on a.id = lr.action_id
  where lr.id = new.listening_record_id;

  if record_source_type = 'roda' or action_type_value = 'roda' then
    raise exception 'Relato de roda nao pode ser aprovado como fala publica individual.';
  end if;

  return new;
end;
$$;

drop trigger if exists block_conversation_circle_public_quote_approval
on public.listening_record_public_quotes;

create trigger block_conversation_circle_public_quote_approval
before insert or update on public.listening_record_public_quotes
for each row execute function public.block_conversation_circle_public_quote_approval();

drop policy if exists "Autenticados podem ler bairros citados em escutas"
on public.listening_record_mentioned_neighborhoods;
drop policy if exists "Autenticados não leitores podem vincular bairros citados"
on public.listening_record_mentioned_neighborhoods;
drop policy if exists "Equipe edita próprios bairros citados; admin e coordenação e"
on public.listening_record_mentioned_neighborhoods;
drop policy if exists "Equipe remove próprios bairros citados; admin e coordenação "
on public.listening_record_mentioned_neighborhoods;
drop policy if exists mentioned_neighborhoods_select
on public.listening_record_mentioned_neighborhoods;
drop policy if exists mentioned_neighborhoods_insert
on public.listening_record_mentioned_neighborhoods;
drop policy if exists mentioned_neighborhoods_update
on public.listening_record_mentioned_neighborhoods;
drop policy if exists mentioned_neighborhoods_delete
on public.listening_record_mentioned_neighborhoods;

create policy mentioned_neighborhoods_select
on public.listening_record_mentioned_neighborhoods for select to authenticated
using (true);

create policy mentioned_neighborhoods_insert
on public.listening_record_mentioned_neighborhoods for insert to authenticated
with check (
  public.get_user_role() in ('admin', 'coordenacao', 'equipe')
  and created_by = auth.uid()
);

create policy mentioned_neighborhoods_update
on public.listening_record_mentioned_neighborhoods for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (public.get_user_role() = 'equipe' and created_by = auth.uid())
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (public.get_user_role() = 'equipe' and created_by = auth.uid())
);

create policy mentioned_neighborhoods_delete
on public.listening_record_mentioned_neighborhoods for delete to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (public.get_user_role() = 'equipe' and created_by = auth.uid())
);
