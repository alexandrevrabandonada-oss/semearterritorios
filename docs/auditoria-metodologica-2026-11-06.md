# Auditoria metodológica — estado parcial

Consulta somente de leitura à produção em 6 de novembro de 2026. Nenhum conteúdo de escuta foi incluído neste documento.

## Evidências e riscos

- **Crítico — revisão humana:** `listening_records.review_status` é usado como evidência de revisão e para selecionar dados em devolutivas, leituras coletivas e transparência, mas passou a ser atribuído automaticamente no cadastro. Os 296 registros consultados tinham `reviewed`; isso não comprova revisão humana. Separar prontidão de revisão humana exige registro próprio, trilha de auditoria, invalidação quando o conteúdo revisado muda e atualização de todos os consumidores. Ainda não implementado.
- **Crítico — confirmação de ações:** 31 ações estavam com `status = realizada`, alterado em massa nesta sessão anterior. Esse valor não comprova que a ação ocorreu. Falta confirmação independente com responsável, data e revisão dos relatórios e eventos de agenda. Ainda não implementado.
- **Alto — devolutiva aprovada:** havia uma devolutiva aprovada, id `0d0850f6-476d-48c0-82df-71ed9918385d`, para ação de 18/04/2026. Preservada; precisa de revisão humana de suas fontes e indicadores antes de nova circulação. Não havia snapshots em `public_transparency_snapshots` na consulta. Isso não prova ausência de exportações ou materiais externos.
- **Alto — seleção divergente:** `buildActionDebrief` usava rascunhos sem alerta quando não havia registros com status revisado. Esta alteração elimina esse fallback; a existência de status revisado continua sem comprovar revisão humana, até a migração pendente.
- **Alto — circulação sem aprovação:** o componente de síntese oferecia copiar uma “devolutiva pública” gerada de todos os registros sem revisão e ainda afirmava não conter dados identificáveis. Esta alteração remove esse atalho; os botões restantes são apresentados como síntese interna.
- **Alto — unidade de análise:** o atalho público contava registros como pessoas. Na consulta, 296 registros incluíam 31 relatos de roda (classificados por origem ou tipo da ação) e 265 registros individuais. Um registro não prova uma pessoa única. Outros painéis e exportações ainda precisam da mesma revisão.
- **Alto — denominador territorial:** 102 dos 265 registros individuais estavam sem bairro de referência (38,5%); 163 o informavam (61,5%). É cobertura de preenchimento, não representatividade populacional. Há 142 registros sem resumo da equipe e 10 sem prioridade informada, considerando todos os tipos.
- **Alto — critérios e privacidade:** detectar padrões de CPF, telefone, e-mail e endereço não garante anonimização. Falas, prioridades, lugares, ocupações e cruzamentos de pequenos grupos exigem revisão humana; não se deve inferir segurança apenas pela ausência de alerta automático.
- **Médio — relatório mensal:** listava todas as ações como realizadas mesmo quando calculava `actions.length` sem filtrar o status. Esta alteração descreve ações cadastradas e esclarece que a realização não está confirmada. O tratamento de status, datas e período em todos os formatos ainda deve ser harmonizado.
- **Médio — prontidão e sensibilidade:** a regra de prontidão aceitava 100% com status revisado antes de verificar alertas sensíveis. A alteração prioriza o alerta sensível; demais campos e relações ainda precisam de avaliação.
- **Médio — validade de período:** o formato anterior aceitava meses 00 e 13. A validação agora exige mês entre 01 e 12.
- **Médio — frequências:** palavras na síntese de ação são contadas por ocorrência textual, podendo repetir em um único registro; temas são contados por vínculo. Outros relatórios usam regras distintas e cortam rankings. Falta definir e testar denominadores e deduplicação antes de comparar os números.

## Fluxos identificados

Síntese por ação: `components/actions/action-synthesis.tsx` e `lib/action-pilot.ts`; devolutiva: `lib/action-debriefs.ts` e tela de aprovação; relatório mensal: `lib/monthly-reports.ts` e sua tela; leituras coletivas: `lib/collective-readings.ts`; transparência: `lib/transparency-snapshots.ts` e rota `from-leituras`. A revisão não cobriu exaustivamente todas as telas, exportações e dados históricos.

## Validação executada e pendências

- 22 testes de relatórios, transparência e garantias metodológicas passaram; verificação TypeScript sem erros antes do último ajuste textual.
- Não houve teste autenticado ponta a ponta, migração, alteração do banco nesta etapa, nem publicação dessas correções.
- Antes de liberar: projetar e testar confirmação humana auditável, compatibilidade e backfill conservador; revisar políticas e todos os consumidores; comparar amostras controladas; avaliar versões aprovadas e exportadas; executar build e testes completos; validar privacidade e publicação.

