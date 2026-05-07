# Estado da Nação — SEMEAR Territórios 047

## Diagnóstico inicial

O sistema já tinha editor revisável de snapshot, checklist persistido, detector de risco, trilha de auditoria editorial e bloqueio de publicação por comentários críticos. Faltava um artefato institucional versionado para congelar a versão aprovada, registrar assinatura interna e separar claramente snapshot, versão e homologação formal.

## Migration criada

- `20260506223000_add_transparency_homologation_packages.sql`

## Tabela criada

- `public_transparency_homologation_packages`

## Biblioteca criada

- `lib/transparency-homologation.ts`

## Rotas criadas

- `/transparencia/homologacao`
- `/transparencia/homologacao/[id]`
- `/transparencia/homologacao/[id]/preview`

## Componentes criados

- `components/transparency/transparency-homologation-checklist.tsx`
- `components/transparency/transparency-homologation-workspace.tsx`

## Regra de snapshot congelado

O pacote gera `frozen_payload` apenas com campos públicos e sanitizados:

- título;
- resumo público;
- totais;
- territórios agregados;
- temas;
- palavras recorrentes sanitizadas;
- linha do tempo;
- notas de privacidade;
- status e versão.

Nada de escuta bruta, fala original, entrevistador, e-mail, CPF, telefone, endereço, dado de saúde individual ou lugar sensível entra nesse congelamento.

## Regra de assinatura

Assinatura só é permitida se:

- snapshot estiver `approved` ou `published`;
- comentários críticos estiverem resolvidos;
- detector não encontrar CPF, telefone ou e-mail;
- checklist multi-etapa estiver completo;
- `frozen_payload` estiver preenchido;
- pacote não estiver `rejected` nem `archived`.

## Export Markdown

Foi criado export institucional em Markdown com:

- código do pacote;
- snapshot;
- período;
- resumo aprovado;
- metodologia;
- checklist;
- alertas de risco;
- histórico editorial;
- comentários;
- decisão institucional;
- assinatura interna.

## Preview institucional

Foi criado preview limpo para impressão em `/transparencia/homologacao/[id]/preview`, com CSS print e sem dependência de PDF nativo.

## Telas alteradas

- editor de snapshot agora mostra card de homologação institucional;
- lista de snapshots ganhou acesso à homologação institucional;
- preview interno passou a exibir status do pacote.

## Documentação criada ou atualizada

- `docs/pacote-homologacao-transparencia-viva.md`
- `docs/homologacao-pacote-transparencia-viva.md`
- `docs/transparencia-viva-publica.md`
- `docs/editor-snapshot-publico.md`
- `docs/homologacao-editorial-transparencia-viva.md`
- `docs/homologacao-transparencia-viva.md`

## Verificação

- `npm run lint`: ok
- `npm run build`: ok
- `npm run verify`: ok
- migration `20260506223000` aplicada no remoto

## Riscos restantes

- ainda não há teste automatizado cobrindo o fluxo completo de assinatura e RLS;
- ainda é possível gerar múltiplos pacotes para o mesmo snapshot; isso é aceitável como trilha histórica, mas pode pedir regra de pacote ativo único no próximo tijolo;
- preview institucional ainda é HTML com print CSS, não PDF assinado.

## Próximo tijolo recomendado

Tijolo 048: testes automatizados do fluxo editorial e institucional da Transparência Viva, incluindo RLS, API pública, bloqueios de assinatura e regressão do payload sanitizado.
