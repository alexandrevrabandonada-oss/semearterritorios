# Estado da Nação — SEMEAR Territórios 031

## Diagnóstico inicial

Foi verificado o fluxo preparado no Tijolo 030:

- `supabase/seeds/neighborhoods.official.template.csv` existe.
- `scripts/build-neighborhoods-official-sql.ts` existe.
- `scripts/check-neighborhood-cleanup-safety.ts` existe.
- `docs/validacao-lista-oficial-territorios.md` existe.
- `docs/preparacao-primeira-acao-real.md` existe.
- `supabase/seeds/neighborhoods.official.csv` não existe neste workspace.

Diagnóstico remoto herdado do Estado da Nação 029:

- `neighborhoods_total = 23`
- `actions_total = 0`
- `records_total = 0`
- sem vínculos reais registrados em ações ou escutas naquele diagnóstico.

## CSV oficial

CSV oficial ainda não fornecido. Não foi aplicada alteração territorial.

Como `supabase/seeds/neighborhoods.official.csv` não existe, este tijolo não gerou migration de aplicação da lista oficial e não executou substituição de bairros.

## Validação da lista oficial

O script `scripts/build-neighborhoods-official-sql.ts` foi reforçado para validar:

- colunas obrigatórias;
- `name` preenchido;
- `city` preenchido;
- status válido;
- duplicidade grosseira por nome normalizado;
- nomes com aparência de endereço pessoal ou logradouro específico;
- nomes com aparência de território sensível ou identificável.

Sem CSV oficial real, a validação não foi executada contra lista oficial.

## Checagem de limpeza segura

`scripts/check-neighborhood-cleanup-safety.ts` permanece preparado para gerar:

- `supabase/seeds/generated/neighborhoods.cleanup-safety.report.md`

Regras mantidas:

- `SAFE_TO_REMOVE` apenas sem vínculos;
- `BLOCKED` com vínculo em `actions`;
- `BLOCKED` com vínculo em `listening_records`;
- `BLOCKED` com vínculo em `places_mentioned`;
- `BLOCKED` com vínculo em `normalized_places`.

Nenhum delete foi executado.

## Migration

Nenhuma migration `apply_official_neighborhoods` foi criada.

Motivo: lista oficial real ainda não foi fornecida. Criar migration agora exigiria inventar territórios, o que está fora das regras do tijolo.

## Mudanças em `/territorios`

O painel territorial foi ajustado para reforçar que:

- a lista atual deve ser tratada como operacional/provisória;
- o app não aplica CSV automaticamente;
- a validação oficial deve passar por `docs/validacao-lista-oficial-territorios.md`;
- territórios são agregações, não localização individual.

## Mudanças em `/ajuda`

O bloco “Pronto para primeira ação real?” permanece como checklist operacional para a primeira Banca de Escuta.

## Mudanças em `/acoes/nova`

O formulário de ação recebeu microcopy para:

- orientar uso do tipo banca de escuta;
- diferenciar local coletivo de endereço pessoal;
- avisar sobre lista territorial provisória;
- reforçar que não se deve registrar dado pessoal de participantes.

## Documento criado

- `docs/cadastro-primeira-acao-real.md`

O documento orienta cadastro manual da primeira ação real sem criar seed ou registro automático no banco.

## Como cadastrar a primeira ação real

1. Abrir `/acoes/nova`.
2. Usar título `Banca de Escuta — Feira Livre — [território]`.
3. Selecionar `banca_escuta`.
4. Informar data e território.
5. Usar local coletivo, sem endereço pessoal.
6. Registrar objetivo, equipe e público estimado.
7. Salvar.
8. Após a feira, usar `/escutas/lote`.

## Privacidade

As telas e documentos reforçam:

- não coletar CPF;
- não coletar telefone;
- não coletar endereço pessoal;
- não registrar dado de saúde individual identificável;
- território/bairro é agregação, não localização de pessoa;
- local da ação pode ser equipamento, feira ou praça, nunca residência.

## Riscos restantes

- a lista oficial ainda depende de envio real da APS/equipe territorial;
- a limpeza segura ainda precisa ser executada no banco aplicado quando houver CSV oficial;
- a primeira ação real ainda não deve ser criada automaticamente sem dados definidos.

## Próximo tijolo recomendado

Receber `supabase/seeds/neighborhoods.official.csv`, rodar validação, gerar SQL revisável, checar limpeza segura no remoto e só então criar migration versionada de aplicação oficial.
