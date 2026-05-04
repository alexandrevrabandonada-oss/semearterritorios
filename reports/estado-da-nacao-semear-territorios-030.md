# Estado da Nação — SEMEAR Territórios 030

## Diagnóstico do banco remoto

O diagnóstico deste tijolo foi baseado no estado estabilizado registrado no relatório anterior e nos templates já presentes no repositório.

Status remoto conhecido a partir de `reports/estado-da-nacao-semear-territorios-029.md`:

- `neighborhoods_total = 23`
- `neighborhoods_with_actions = 0`
- `neighborhoods_with_records = 0`
- `actions_total = 0`
- `records_total = 0`

Leitura operacional:

- ainda não há vínculos reais em ações ou escutas;
- a lista atual permanece operacional/provisória;
- este é o momento mais seguro para validar ou substituir a lista oficial antes da primeira ação real.

Sobre vínculos com lugares:

- o relatório 029 não registrou vínculos reais;
- o script novo de checagem segura foi criado para confirmar, no banco aplicado, se há bairros bloqueados por `places_mentioned` ou `normalized_places` antes de qualquer limpeza.

## Status da lista operacional

A lista de bairros atual continua sendo operacional até validação da APS/equipe territorial. O principal risco segue sendo manter essa lista por tempo excessivo sem substituição oficial.

## Documentos criados

- `docs/validacao-lista-oficial-territorios.md`
- `docs/template-lista-oficial-territorios.csv.md`
- `docs/preparacao-primeira-acao-real.md`

## Scripts criados

- `scripts/build-neighborhoods-official-sql.ts`
- `scripts/check-neighborhood-cleanup-safety.ts`

## Templates criados

- `supabase/seeds/neighborhoods.official.template.csv`

## Mudanças em `/territorios`

Foi adicionado um painel administrativo de validação territorial com:

- total de territórios;
- territórios sem uso;
- territórios com ações;
- territórios com escutas;
- aviso de lista operacional/provisória;
- orientação para validar a lista oficial antes de ampliar o uso.

## Mudanças em `/ajuda`

Foi adicionada a seção “Pronto para primeira ação real?” com checklist de prontidão operacional:

- banco remoto estabilizado;
- usuários e papéis testados;
- lista territorial validada ou provisória aprovada;
- primeira ação cadastrada;
- fichas preparadas;
- equipe orientada sobre privacidade;
- fluxo de digitação em lote revisado.

## Como validar a lista oficial

1. Preencher `docs/validacao-lista-oficial-territorios.md`.
2. Usar `supabase/seeds/neighborhoods.official.template.csv` como base.
3. Se necessário, consultar `docs/template-lista-oficial-territorios.csv.md`.
4. Salvar a versão real em `supabase/seeds/neighborhoods.official.csv`.
5. Rodar `scripts/build-neighborhoods-official-sql.ts` para gerar SQL em `supabase/seeds/generated/`.
6. Revisar o relatório de validação gerado antes de criar migration ou seed versionada.

## Como checar limpeza segura

1. Rodar `scripts/check-neighborhood-cleanup-safety.ts` com acesso ao banco aplicado.
2. Ler o relatório em `supabase/seeds/generated/neighborhoods.cleanup-safety.report.md`.
3. Remover apenas territórios marcados como `SAFE_TO_REMOVE`.
4. Não remover qualquer território marcado como `BLOCKED`.

## Como preparar a primeira ação real

Seguir `docs/preparacao-primeira-acao-real.md`:

1. confirmar lista de territórios;
2. cadastrar ação em `/acoes/nova`;
3. usar `banca_escuta`;
4. conferir território, data e local;
5. digitar fichas em `/escutas/lote`;
6. revisar escutas;
7. gerar devolutiva;
8. fechar dossiê;
9. conferir relatório mensal.

## Privacidade

Os novos documentos e telas reforçam:

- não coletar CPF;
- não coletar telefone;
- não coletar endereço pessoal;
- não registrar dado de saúde individual identificável;
- tratar bairros/territórios como agregação, não como localização de pessoa.

## Riscos restantes

- a lista oficial ainda depende de validação humana da APS/equipe territorial;
- a checagem de limpeza segura precisa ser executada no banco aplicado antes de remover bairros operacionais;
- qualquer limpeza futura deve ocorrer apenas após relatório de segurança e revisão versionada.

## Próximo tijolo sugerido

Receber a lista oficial real, gerar SQL validado a partir do CSV, aplicar no banco remoto e cadastrar a primeira ação real da Banca de Escuta.
