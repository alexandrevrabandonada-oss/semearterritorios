-- Tijolo 053 - Curadoria da Memória Pública
-- Expande a tabela project_memory_entries com campos de revisão e governança.

alter table public.project_memory_entries
add column if not exists review_checklist jsonb not null default '{}'::jsonb,
add column if not exists reviewed_by uuid null references public.profiles(id) on delete set null,
add column if not exists reviewed_at timestamptz null;

-- Comentários para documentação do schema
comment on column public.project_memory_entries.review_checklist is 'Checklist de privacidade e qualidade editorial preenchido pela coordenação.';
comment on column public.project_memory_entries.reviewed_by is 'Perfil que realizou a última revisão da entrada.';
comment on column public.project_memory_entries.reviewed_at is 'Data da última revisão realizada.';

-- Refinamento de RLS para garantir que equipe não possa aprovar para público diretamente
-- A política de INSERT já restringe equipe a 'internal' se o relatório de origem for deles.
-- Vamos reforçar a política de UPDATE.

drop policy if exists "Coordenação/admin revisam memória pública; equipe só atualiza memória interna própria" on public.project_memory_entries;

create policy "Coordenação/admin revisam memória pública; equipe só atualiza memória interna própria"
on public.project_memory_entries for update to authenticated
using (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and visibility = 'internal'
  )
)
with check (
  public.get_user_role() in ('admin', 'coordenacao')
  or (
    public.get_user_role() = 'equipe'
    and created_by = auth.uid()
    and visibility = 'internal'
  )
);
