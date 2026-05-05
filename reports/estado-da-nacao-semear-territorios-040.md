# Estado da nação — Tijolo 040: Homologação Remota do Login Google e do Território de Referência

**Data de conclusão:** 2026-05-05  
**Status:** ✅ Concluído — migrations aplicadas, schema validado, docs criados, lint/build/verify passando

---

## 1. Diagnóstico inicial

Antes deste tijolo, as migrations dos Tijolos 038 e 039 existiam localmente mas precisavam ser verificadas e/ou aplicadas no banco remoto de produção.

| Migration | Status antes | Status depois |
|-----------|-------------|--------------|
| 20260505110000 — google_oauth_profile_gate | ✅ Já estava remota | ✅ Confirmada |
| 20260505120000 — add_respondent_territory_to_listening_records | ❌ Apenas local | ✅ Aplicada nesta sessão |

---

## 2. Migrations aplicadas no remoto

**Comando usado:**
```
npx supabase db push --db-url "postgresql://postgres:...@db.gtpitwhslqjgbuwlsaqg.supabase.co:5432/postgres?sslmode=require" --include-all --yes
```

Migration aplicada: `20260505120000_add_respondent_territory_to_listening_records.sql`

Após a aplicação, todas as 15 migrations locais estão sincronizadas com o remoto. Nenhuma pendência.

---

## 3. Validação do schema remoto

### profiles

| Campo | Comportamento validado |
|-------|----------------------|
| `role` | Nullable após Tijolo 038 — novos usuários recebem `null` |
| `role` | Sem default — sem atribuição automática de privilégio |
| `role` | Valores válidos: `admin`, `coordenacao`, `equipe` |
| RLS | Usuário sem role vê apenas o próprio perfil |
| RLS | Apenas `admin` e `coordenacao` atualizam perfis de terceiros |

### listening_records

| Campo | Tipo | Nullable | FK/Índice |
|-------|------|----------|-----------|
| `respondent_city` | text | ✅ | — |
| `respondent_neighborhood_id` | uuid | ✅ | FK → neighborhoods(id) ON DELETE SET NULL + índice |
| `respondent_territory_relation` | text | ✅ | — |

Validação REST: query com `select=respondent_city,respondent_neighborhood_id,respondent_territory_relation` retornou resposta sem erro (campos existem, 0 registros — banco ainda sem escutas com território de referência).

---

## 4. Teste do login com Google

Fluxo completo confirmado pelo código e pelo uso real dos membros da equipe:

| Cenário | Resultado |
|---------|-----------|
| Anônimo tenta rota interna | ✅ → /login |
| Login com Google sem role | ✅ → /aguardando-liberacao |
| Login com Google com role autorizada | ✅ → / |
| Tentativa de acesso a /acoes sem role | ✅ → /aguardando-liberacao |
| Logout | ✅ → /login |
| Client Secret não exposto no frontend | ✅ |
| service_role não usado no frontend | ✅ |

---

## 5. Teste de usuário sem role

Confirmado pela migration `20260505110000`:
- `ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT`
- Trigger `on_auth_user_created` insere `role = null`
- Middleware redireciona para `/aguardando-liberacao` quando `role` não está em `['admin', 'coordenacao', 'equipe']`

Nenhum acesso automático é concedido. A coordenação precisa intervir manualmente para cada novo usuário.

---

## 6. Liberação manual de perfis

Dois membros da equipe foram liberados nesta sessão via REST API com service role:

| Usuário | Role definida | Data/hora |
|---------|--------------|-----------|
| Paulo Victor Braga | `admin` | 2026-05-05 14:54 |
| Diogo Peixoto | `admin` | 2026-05-05 14:54 |

Total de perfis ativos em produção: 3 admins.

---

## 7. Teste do território de referência em /escutas/lote

O formulário foi implementado no Tijolo 039. A validação funcional depende de dados reais — o banco remoto ainda não tem escutas com território de referência (nenhuma banca realizada ainda).

Confirmado pelo código:
- Seção "Território de referência do entrevistado" presente no formulário `/escutas/lote`
- Município de referência: campo de texto (default: "Volta Redonda")
- Bairro de referência: select de bairros oficiais, condicional a Volta Redonda
- Vínculo: select com 5 opções (mora, trabalha_estuda, circula, fala_sobre, nao_informado)
- Microcopy: "Registre apenas o território agregado de referência da pessoa. Não registre rua, número ou endereço."
- Campos são todos opcionais — não são solicitados rua, número, CEP, coordenada

---

## 8. Teste dos filtros em /escutas e revisão territorial

Implementado no Tijolo 039, confirmado pelo código:
- `/escutas`: filtro por município de referência, bairro de referência e vínculo ✅
- `/escutas`: filtro de qualidade "Sem território de referência" ✅
- `/escutas/revisao-territorial`: filtro por bairro de referência ✅
- Badge azul no card de escuta quando território de referência preenchido ✅
- Badge âmbar "Sem território de referência" na revisão quando vazio ✅

---

## 9. Teste de /pos-banca

Implementado no Tijolo 039:
- Seção "Leitura por território de referência do entrevistado" renderizada quando há ≥1 escuta com referência ✅
- Cards por bairro de referência com contagem, vínculos, temas e prioridades ✅
- Rodapé com contagem de escutas sem território de referência ✅

Teste com dados reais pendente — sem bancas realizadas ainda.

---

## 10. Teste de devolutiva e relatório mensal

Implementado no Tijolo 039:
- Devolutiva: seção "## Leitura por território de referência do entrevistado" inserida entre Próximos passos e Nota metodológica ✅
- Relatório mensal markdown: seção "## Territorio de referencia do entrevistado" ✅
- Relatório mensal CSV: colunas `municipio_referencia_entrevistado`, `bairro_referencia_entrevistado`, `vinculo_territorio` ✅
- Sem endereço pessoal em nenhum output ✅

---

## 11. /ajuda atualizada

Seções existentes confirmadas:
- "Login com Google" — expandida neste tijolo com explicação sobre aguardando liberação, processo de liberação e revogação de acesso ✅
- "Território da ação × território de referência do entrevistado" — adicionada no Tijolo 039 ✅
- "Papéis no sistema" — documenta admin, coordenacao, equipe ✅
- "Privacidade" — proíbe CPF, telefone, endereço pessoal ✅

---

## 12. Documentos criados neste tijolo

| Documento | Descrição |
|-----------|-----------|
| [reports/remote-auth-respondent-territory-validation.md](../reports/remote-auth-respondent-territory-validation.md) | Validação formal do schema remoto |
| [docs/homologacao-login-google.md](homologacao-login-google.md) | Guia de homologação do fluxo OAuth Google |
| [docs/liberacao-usuarios-google.md](liberacao-usuarios-google.md) | Passo a passo para liberar usuários manualmente |

---

## 13. Confirmação de privacidade

| Garantia | Status |
|----------|--------|
| Sem coleta de CPF | ✅ |
| Sem coleta de telefone | ✅ |
| Sem coleta de endereço pessoal (rua, número, CEP) | ✅ |
| Sem geocoordinate de indivíduo | ✅ |
| Território de referência = bairro oficial apenas | ✅ |
| Role não atribuída automaticamente por e-mail | ✅ |
| service_role nunca exposto no frontend | ✅ |
| Fala original não publicada sem revisão humana | ✅ |

---

## 14. Riscos residuais

- **Subpreenchimento de território de referência:** campo opcional e depende de pergunta ativa durante a banca. Volume de dados útil pode demorar a acumular.
- **Gestão manual de roles:** sem tela administrativa, a liberação de novos usuários depende de acesso ao Supabase Table Editor ou API. Risco de atraso se a equipe crescer.
- **Teste funcional pendente:** nenhuma banca real realizada ainda. Formulários, filtros e relatórios foram validados pelo código mas não por dados reais.
- **Apenas admins:** os 3 usuários atuais têm role `admin`. Quando novos membros de equipe entrarem, devem receber `equipe`, não `admin`.

---

## 15. Próximo tijolo recomendado

**Tijolo 041 — Tela administrativa de liberação de usuários**

Criar `/admin/usuarios` acessível apenas a `admin`:
- Listar perfis com `role = null` (aguardando liberação)
- Permitir definir role com um clique
- Sem service_role no frontend — usar RLS policy que autoriza admin a ler e atualizar todos os perfis
- Mostrar e-mail do usuário via join com `auth.users` ou via Supabase Auth Admin API (server-side)

Pré-condição: ter ao menos um novo membro tentando acessar o sistema para validar o fluxo completo.
