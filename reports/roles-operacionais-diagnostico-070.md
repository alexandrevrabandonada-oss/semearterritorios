# Diagnóstico Operacional de Papéis — Tijolo 070

**Data:** 2026-05-12  
**Ambiente:** Produção (`gtpitwhslqjgbuwlsaqg.supabase.co`)  
**Método:** leitura segura via `profiles`, `team_members` e `auth.admin.listUsers` com service role no backend de diagnóstico.

## Resumo quantitativo (antes da regularização)

- Total de usuários em `profiles`: **7**
- Total de usuários em `auth.users` (via Admin API): **7**
- Total de registros em `team_members`: **6**
- `admin`: **6**
- `coordenacao`: **0**
- `equipe`: **0**
- `role = null`: **1**
- `auth.users` sem `profiles` vinculado: **0**

## Leitura operacional (antes)

1. Há concentração excessiva de privilégio em `admin`.
2. Não existe separação real entre operação de campo (`equipe`) e governança (`coordenacao`).
3. Existe 1 perfil autenticado sem papel (`role = null`), atualmente dependente do fluxo de aguardando liberação.
4. Há 1 usuário sem vínculo em `team_members` (o mesmo perfil sem role), o que reforça pendência de regularização.

## Evidência mascarada (sem PII completa)

| Tipo | Quantidade | Observação |
|---|---:|---|
| E-mails mascarados validados | 7 | Ex.: `al***@i*.uff.br`, `pv***@gm***.com` |
| Perfis com `team_member` ativo | 6 | Vínculos operacionais existentes |
| Perfil sem `team_member` | 1 | Coincide com `role = null` |

## Recomendações de ajuste (menor privilégio)

1. Definir pelo menos **1 usuário `coordenacao`** (ideal: 2 para cobertura operacional).
2. Definir pelo menos **2 usuários `equipe`** para operação de escutas e relatórios.
3. Reduzir `admin` para somente o necessário de gestão técnica/institucional.
4. Regularizar imediatamente o perfil com `role = null` para `equipe` ou `coordenacao` conforme decisão formal.
5. Registrar em ata interna a matriz final de papéis e responsáveis.

## Proposta mínima para sair do risco atual

- Estado atual: `admin=6`, `coordenacao=0`, `equipe=0`, `null=1`
- Estado mínimo recomendado: `admin=2`, `coordenacao=2`, `equipe=3`, `null=0`

## Execução realizada (opção 1)

Regularização aplicada em produção no dia 2026-05-12 com critério objetivo e trilha técnica:

- manter 2 `admin`;
- converter 2 perfis para `coordenacao`;
- converter 3 perfis para `equipe` (incluindo o perfil que estava com `role = null`).

### Resultado pós-regularização

- `admin`: **2**
- `coordenacao`: **2**
- `equipe`: **3**
- `role = null`: **0**

### Pendência remanescente

- Perfis sem vínculo em `team_members`: **1**

> Observação: a regularização de role foi concluída sem abrir novos privilégios além do necessário e sem alterar políticas RLS.
