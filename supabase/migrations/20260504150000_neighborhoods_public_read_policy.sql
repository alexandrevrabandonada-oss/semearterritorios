-- Bairros/territórios são agregações geográficas públicas, sem dados pessoais.
-- A leitura pública é necessária para que selects operacionais funcionem
-- antes da sessão de autenticação carregar (anon key), e para usuários autenticados.
-- Esta política NÃO expõe nenhum dado pessoal — nomes de bairros são informação pública.

drop policy if exists "Leitura pública de bairros" on public.neighborhoods;
create policy "Leitura pública de bairros"
  on public.neighborhoods
  for select
  to anon, authenticated
  using (true);
