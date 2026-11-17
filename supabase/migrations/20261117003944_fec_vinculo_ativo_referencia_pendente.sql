begin;
-- Referência jurídica não é a identidade interna (id) da frente.
alter table public.fec_engagements alter column contract_reference drop not null;
alter table public.fec_engagements add column contract_reference_confirmed boolean not null default false;
alter table public.fec_engagements add constraint fec_contract_confirmation_requires_reference
  check (not contract_reference_confirmed or nullif(btrim(contract_reference),'') is not null);
comment on column public.fec_engagements.contract_reference is 'Referência jurídica opcional, pendente até confirmação institucional.';
comment on column public.fec_engagements.contract_reference_confirmed is 'Confirmação institucional da referência, não constitui atesto financeiro.';

-- Os grants FEC permanecem necessários e são provisionados apenas por serviço/DBA.
-- O vínculo de equipe deve apontar para o perfil autenticado e estar ativo.
create or replace function private.fec_has_assignment(p_engagement_id uuid, p_role text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('equipe','coordenacao','admin'))
    and exists (select 1 from public.team_members t where t.profile_id=auth.uid() and t.active is true)
    and exists (select 1 from public.fec_access_grants g where g.engagement_id=p_engagement_id
      and g.user_id=auth.uid() and g.active is true and (p_role is null or g.role=p_role));
$$;
-- Limite de processamento também exige o mesmo vínculo verificado no banco.
create or replace function private.fec_import_acquire_capacity() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); lease uuid;
begin
 if actor is null or not exists(select 1 from public.fec_access_grants g where g.user_id=actor and public.fec_has_assignment(g.engagement_id) and public.fec_scope_is_active(g.engagement_id)) then return null; end if;
 perform pg_advisory_xact_lock(hashtext('fec-import-global-capacity'));
 delete from private.fec_import_leases where expires_at < now();
 delete from private.fec_import_admission_attempts where created_at < now() - interval '1 hour';
 if (select count(*) from private.fec_import_admission_attempts where actor_id=actor)>=20 then return null; end if;
 if (select count(*) from private.fec_import_leases)>=2 then return null; end if;
 insert into private.fec_import_admission_attempts(actor_id) values(actor);
 insert into private.fec_import_leases(actor_id,expires_at) values(actor,now()+interval '90 seconds') returning id into lease;
 return lease;
end; $$;
commit;
