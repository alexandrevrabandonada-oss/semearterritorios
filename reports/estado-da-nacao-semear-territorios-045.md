# Estado da Nação SEMEAR Territórios 045

## Diagnóstico inicial

O Tijolo 044 já tinha tabela `public_transparency_snapshots`, RLS básica, lista interna, preview autenticado, API pública filtrando `published` e gerador determinístico de snapshot. O principal risco remanescente era editorial: faltavam campos editáveis, checklist persistido, diff básico, detector de risco e regra robusta para republicação.

## Migration criada

Migration: `supabase/migrations/20260506193000_extend_public_transparency_snapshots_editorial_flow.sql`.

Ela adiciona campos editoriais, checklist persistido, metadados de última edição/revisão, trigger de guarda para publicação e políticas de update mais restritas.

## Telas alteradas e criadas

- `/transparencia/snapshots`: mantida como lista e porta de entrada.
- `/transparencia/snapshots/[id]`: novo editor revisável por snapshot.
- `/transparencia/preview`: ampliado com status, selo interno, alertas e bloco de amostra mínima.
- `/ajuda`: nova seção de revisão de transparência pública.

## Checklist criado

Componente: `components/transparency/transparency-privacy-checklist.tsx`.

O checklist cobre fala original, entrevistador, e-mail, CPF, telefone, endereço/CEP, dado de saúde, ocupações raras, amostra mínima, lugares sensíveis e revisão por coordenação/admin.

## Detector de risco criado

Arquivo: `lib/transparency-privacy.ts`.

Detecta CPF, telefone, e-mail, CEP, URL externa ao projeto, pistas de endereço com número e excesso simples de nomes próprios. CPF, telefone e e-mail bloqueiam publicação.

## Regras de publicação

- `draft`: equipe autora, coordenação e admin podem editar.
- `reviewed`: coordenação/admin podem conduzir revisão.
- `approved`: coordenação/admin.
- `published`: coordenação/admin, com checklist completo e sem bloqueio de CPF/telefone/e-mail.
- `archived`: coordenação/admin.

Se um snapshot publicado for editado, o banco força retorno para `reviewed` e limpa publicação/aprovação anteriores.

## Teste de RLS e API documentado

Documento criado: `docs/homologacao-transparencia-viva.md`.

Ele cobre criação por equipe, publicação por coordenação/admin, bloqueio de checklist, bloqueio de risco e leitura anon apenas de `published`.

## Como editar snapshot

Abrir `/transparencia/snapshots`, escolher o snapshot e entrar em `/transparencia/snapshots/[id]`. Editar campos públicos, revisar o diff do resumo, conferir checklist e, se necessário, regenerar os blocos automáticos.

## Como aprovar e publicar

Coordenação/admin deve revisar o texto, confirmar checklist, observar alertas do detector e então marcar `reviewed`, `approved` e `published`.

## Riscos restantes

- O diff é textual e básico; ainda não há comparação estruturada por bloco.
- O detector de nomes próprios é heurístico e pode gerar falso positivo ou deixar passar casos sutis.
- Falta automação de teste de RLS fora da homologação manual documentada.
- A migration 045 ainda precisa ser aplicada no remoto.

## Próximo tijolo recomendado

Tijolo 046: trilha de auditoria editorial da Transparência Viva, com histórico de versões, comentário de revisão e export seguro para homologação institucional.
