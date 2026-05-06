# Estado da Nação SEMEAR Territórios 044

## Diagnóstico inicial

O SEMEAR já possui dashboard/home, `/mapa`, `/pos-banca`, `/relatorios`, ações, escutas, temas, bairros, território da ação, território de referência do entrevistado, ocupação opcional, equipe operacional, devolutivas, dossiês e regras de privacidade em RLS.

Dados que podem virar públicos apenas de forma agregada: totais de ações e escutas, escutas revisadas, contagem de territórios, temas recorrentes, palavras sanitizadas, status territorial, linha do tempo de ações realizadas e devolutivas aprovadas.

Dados que permanecem internos: fala original, entrevistador, e-mail de equipe, equipe operacional nominal, CPF, telefone, endereço, rua, número, CEP, dado de saúde individual, ocupação rara, lugares sensíveis, registros brutos e qualquer dado sem aprovação.

## Tabela criada

Migration: `supabase/migrations/20260506180000_create_public_transparency_snapshots.sql`.

Tabela: `public_transparency_snapshots`.

Campos principais: título, período, status, resumo público, totais, síntese territorial, síntese de temas, palavras, linha do tempo, devolutivas, notas de privacidade, aprovação, publicação e auditoria.

## Rotas criadas

- `/transparencia/snapshots`: gestão interna de snapshots.
- `/transparencia/preview`: preview autenticado da futura página pública.
- `/api/public/transparencia-viva`: API pública segura, restrita a snapshot publicado.

## Preview criado

O preview interno exibe hero “Transparência Viva SEMEAR”, cards de totais, “O que estamos ouvindo”, temas mais citados, palavras recorrentes, territórios alcançados, linha do tempo, devolutivas aprovadas e aviso metodológico.

## API criada

A API foi criada porque o escopo era simples e seguro. Ela seleciona apenas colunas do snapshot e exige `status = published`. Não retorna escutas brutas, entrevistadores, e-mails, fala original, dados sensíveis ou registros internos.

## Regras de privacidade

O painel público futuro não lê `listening_records`. Ele lê apenas `public_transparency_snapshots` publicados. RLS permite `anon` somente para `status = published`; autenticados podem ler snapshots; equipe cria rascunhos; coordenação/admin aprova e publica.

Não foi usado `service_role` no frontend.

## Regra de amostra mínima

Territórios com menos de 5 escutas revisadas recebem `dados insuficientes para síntese pública`.

Ocupações com menos de 3 ocorrências devem ser agrupadas como `outras ocupações` quando essa dimensão for publicada.

## Como gerar snapshot

Abrir `/transparencia/snapshots` e clicar em `Gerar rascunho`. O gerador é determinístico e consolida ações, escutas revisadas, temas, palavras, territórios, devolutivas aprovadas e dossiês fechados.

## Como aprovar/publicar

O fluxo é: rascunho, revisado, aprovado, publicado, arquivado. Coordenação/admin deve revisar antes de aprovar e publicar. O Portal PWA futuro só deve consumir snapshots publicados.

## Riscos restantes

- Validar a migration no Supabase remoto antes de uso real.
- Revisar manualmente palavras recorrentes antes de publicação.
- Ampliar editor de texto do snapshot se a coordenação quiser ajustar o resumo público dentro da tela.
- Fazer teste manual de RLS anon/autenticado no banco aplicado.
- Garantir que logs e analytics do Portal PWA não capturem payloads sensíveis.

## Próximo tijolo recomendado

Tijolo 045: Editor revisável de Snapshot Público, com campos editáveis, diff de revisão, checklist de privacidade antes da publicação e teste manual guiado de RLS/API.
