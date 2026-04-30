# Estado da Nação — SEMEAR Territórios 016

## Diagnóstico inicial

Foram revisados os pontos de homologação:

- migrations estão listadas em ordem cronológica;
- `public.get_user_role()` é criada em `20260428000000_refine_rls_policies.sql`, antes das migrations que dependem dela;
- `action_debriefs` e `action_closures` existem nas migrations e em `lib/database.types.ts`;
- `/ajuda` está acessível e linkada na navegação;
- o runbook da primeira banca está claro e sem instrução de coleta sensível;
- o dashboard mostra “Próxima operação” com links rápidos;
- seed de homologação é manual e DEV/DEMO;
- impressão da devolutiva e do dossiê usa CSS print sem controles operacionais.

## Decisão sobre papel leitor

Decisão adotada: **Opção B — remover a menção operacional a `leitor`**.

Motivo: o schema atual só possui `admin`, `coordenacao` e `equipe`. Implementar `leitor` exigiria migration, alteração de tipos e revisão ampla de RLS, o que foge do objetivo do Tijolo 16 e adicionaria risco antes da primeira operação controlada.

Resultado:

- `/ajuda` mostra apenas admin, coordenação e equipe;
- `docs/homologacao-primeira-banca.md` não testa leitor;
- `docs/go-no-go-primeira-banca.md` registra que leitor não existe no schema atual.

## Documentos criados

- `docs/go-no-go-primeira-banca.md`
- `docs/registro-homologacao-primeira-banca.md`

## Ajustes na /ajuda

Foi adicionado o bloco “Antes de usar com dados reais”, com checklist:

- migrations aplicadas;
- usuários criados;
- papéis definidos;
- bairros carregados;
- seed demo removido/não usado em produção;
- teste de digitação;
- teste de revisão;
- teste de impressão;
- decisão GO registrada.

A tela também menciona os arquivos:

- `docs/go-no-go-primeira-banca.md`
- `docs/registro-homologacao-primeira-banca.md`

## Alterações de microcopy

Foram ajustados textos em:

- `/ajuda`: remoção do papel inexistente `leitor`;
- `/escutas/lote`: rascunho precisa de revisão antes de relatório, devolutiva ou dossiê;
- `/acoes/[id]/piloto`: diferença entre rascunho e revisada;
- `/acoes/[id]/devolutiva`: diferença entre rascunho, revisada e aprovada;
- `/acoes/[id]/dossie`: diferença entre dossiê aberto e fechado;
- relatório mensal: IA assistida é apenas apoio exploratório, não relatório oficial.

## Estado do seed demo

`scripts/seed-homologacao-banca.sql`:

- não roda automaticamente;
- está marcado como DEV/DEMO;
- agora traz aviso explícito “NÃO RODAR EM PRODUÇÃO”;
- usa dados fictícios;
- usa telefone fictício `00000-0000` apenas para testar alerta;
- não deve ser usado em produção.

## Smoke test final

`scripts/smoke-operacao-semear.md` recebeu a seção “Homologação GO/NO-GO”, cobrindo:

- login;
- cadastro de ação;
- digitação de 3 escutas;
- revisão de 2;
- manutenção de 1 rascunho;
- geração de devolutiva;
- tentativa de aprovação por equipe;
- aprovação por coordenação/admin;
- fechamento de dossiê;
- relatório mensal;
- impressão de devolutiva e dossiê.

## Como rodar GO/NO-GO

1. Aplicar migrations no ambiente de homologação.
2. Criar usuários admin, coordenação e equipe.
3. Opcionalmente rodar `scripts/seed-homologacao-banca.sql` apenas em DEV/DEMO.
4. Executar `scripts/smoke-operacao-semear.md`.
5. Preencher `docs/registro-homologacao-primeira-banca.md`.
6. Marcar decisão em `docs/go-no-go-primeira-banca.md`.

## Pendências reais antes da banca

- Confirmar migrations aplicadas no banco real/staging.
- Confirmar usuários e papéis reais.
- Confirmar bairros/territórios carregados.
- Remover qualquer dado DEV/DEMO antes de produção.
- Rodar homologação com pelo menos um usuário de cada papel existente.
- Validar impressão no navegador usado pela equipe.

## Riscos restantes

- A detecção de dado sensível continua heurística.
- O teste real de RLS depende do ambiente Supabase configurado.
- O papel `leitor` não existe; se for necessário no futuro, deve ser criado em tijolo próprio.
- Homologação GO/NO-GO ainda precisa ser preenchida pela equipe.

## Recomendação final

**GO técnico condicionado.**

O sistema está tecnicamente pronto para homologação real e primeira operação controlada, desde que a equipe preencha o GO/NO-GO, confirme RLS/papéis no ambiente real e não use seeds DEV/DEMO em produção.

## Verificação

Executado:

- `npm run lint`
- `npm run build`
- `npm run verify`
