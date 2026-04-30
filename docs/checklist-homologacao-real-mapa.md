# Checklist de Homologação Real do Mapa Interno

Use este checklist no ambiente real de homologação ou produção controlada. Não use dados pessoais sensíveis e não registre fala original neste documento.

## 1. Banco e migrations

- [ ] Migrations aplicadas.
- [ ] Tabela `internal_map_homologations` criada.
- [ ] Tabela `normalized_places` criada.
- [ ] Campo `places_mentioned.normalized_place_id` existe.
- [ ] RLS ativa nas tabelas envolvidas.
- Evidência/anotação:

## 2. Usuários e papéis

- [ ] Usuário admin criado.
- [ ] Usuário coordenação criado.
- [ ] Usuário equipe criado.
- [ ] Usuário anônimo sem acesso às rotas internas.
- Evidência/anotação:

## 3. RLS manual

- [ ] Admin consegue ler homologações.
- [ ] Admin consegue criar rascunho de homologação.
- [ ] Admin consegue aprovar homologação quando os critérios estão atendidos.
- [ ] Coordenação consegue aprovar homologação quando os critérios estão atendidos.
- [ ] Equipe não consegue aprovar homologação.
- [ ] Equipe não consegue rejeitar homologação.
- [ ] Anônimo não acessa rotas internas.
- [ ] `service_role` não está no frontend.
- Evidência/anotação:

## 4. Dados mínimos

- [ ] 20 ou mais escutas revisadas.
- [ ] 3 ou mais territórios com dados.
- [ ] Revisão territorial concluída.
- [ ] Lugares normalizados.
- [ ] Sensíveis pendentes = 0.
- [ ] Duplicidades relevantes = 0.
- Evidência/anotação:

## 5. Privacidade

- [ ] Fala original não aparece no mapa-lista, portão ou relatórios copiáveis.
- [ ] Entrevistador não aparece no contexto do mapa.
- [ ] CPF não aparece.
- [ ] Telefone não aparece.
- [ ] E-mail não aparece.
- [ ] Endereço pessoal não aparece.
- [ ] Lugares `visibility = sensitive` não aparecem.
- [ ] Lugares `place_type = sensivel_nao_publicar` não aparecem.
- [ ] Não há geocodificação.
- Evidência/anotação:

## 6. Decisão

Marcar uma decisão:

- [ ] Manter mapa-lista.
- [ ] Ampliar dados.
- [ ] Revisar normalização.
- [ ] Liberar protótipo interno.

Justificativa:

Responsável pela decisão:

Data:
