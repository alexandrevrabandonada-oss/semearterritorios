-- Este é um exemplo de arquivo seed para preencher a tabela de territórios/bairros.
-- Adapte ou adicione as regiões oficiais do projeto aqui.
-- Após editar, você pode aplicar este seed no banco de dados, ou deixar que os
-- usuários administradores cadastrem pela interface.

insert into public.neighborhoods (name, city, notes)
values
  ('Centro', 'Cidade Genérica', 'Bairro de referência central'),
  ('Zona Leste', 'Cidade Genérica', 'Território de atuação primário'),
  ('Zona Norte', 'Cidade Genérica', 'Território de atuação secundário')
on conflict (name) do nothing;
