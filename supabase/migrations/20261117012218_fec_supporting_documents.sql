-- FEC: permite quatro anexos privados além do relatório e das fichas.
-- Não altera documentos existentes, ciclos, escutas APS nem indicadores.
begin;

alter table public.fec_import_batches
  drop constraint fec_import_batches_manifest_check;
alter table public.fec_import_batches
  add constraint fec_import_batches_manifest_check
  check (
    jsonb_typeof(manifest) = 'array'
    and jsonb_array_length(manifest) between 1 and 6
    and octet_length(manifest::text) <= 5000
  );

alter table public.fec_import_documents
  drop constraint fec_import_documents_kind_check;
alter table public.fec_import_documents
  add constraint fec_import_documents_kind_check
  check (kind in ('monthly_report', 'questionnaires', 'supporting'));

alter table public.fec_import_documents
  drop constraint fec_import_documents_batch_id_kind_key;
create unique index fec_import_documents_one_primary_kind
  on public.fec_import_documents (batch_id, kind)
  where kind in ('monthly_report', 'questionnaires');

-- Mantém a cardinalidade máxima também para chamadas diretas autenticadas.
create function private.fec_import_document_count_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  document_count integer;
begin
  perform 1 from public.fec_import_batches where id = new.batch_id for update;
  select count(*) into document_count
  from public.fec_import_documents
  where batch_id = new.batch_id;
  if document_count >= 6 then
    raise exception 'Lote FEC excede o limite de documentos.';
  end if;
  return new;
end;
$$;
revoke all on function private.fec_import_document_count_guard() from public, anon, authenticated;
create trigger fec_import_document_count_limit
  before insert on public.fec_import_documents
  for each row execute function private.fec_import_document_count_guard();

-- O limite do endpoint também vale para uploads diretos autorizados ao bucket.
update storage.buckets
set file_size_limit = 4194304
where id = 'fec-import-private';

commit;
