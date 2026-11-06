# Auditoria metodológica — estado parcial

Consulta somente de leitura à produção em 6 de novembro de 2026. Nenhum conteúdo de escuta foi incluído neste documento.

## Evidências e riscos

- **Crítico — revisão humana:** `listening_records.review_status` foi atribuído automaticamente no cadastro. Os 296 registros consultados tinham `reviewed`, sem comprovar revisão humana. A proposta adiciona confirmação separada, responsável e data, trilha de eventos, invalidação por alterações e seleção por revisão humana em sínteses e indicadores principais; o histórico sem evidência permanece não confirmado.
- **Crítico — confirmação de ações:** 31 ações estavam com `status = realizada`, alterado em massa nesta sessão anterior. A proposta registra confirmação separada com responsável e data, mantém o histórico não confirmado e usa essa informação para devolutivas, transparência, agenda e indicadores pertinentes.
- **Alto — devolutiva aprovada:** havia uma devolutiva aprovada, id `0d0850f6-476d-48c0-82df-71ed9918385d`, para ação de 18/04/2026. Preservada; precisa de revisão humana de suas fontes e indicadores antes de nova circulação. Não havia snapshots em `public_transparency_snapshots` na consulta. Isso não prova ausência de exportações ou materiais externos.
- **Alto — seleção divergente:** `buildActionDebrief` usava rascunhos sem alerta quando não havia registros com status revisado. A proposta elimina esse fallback e utiliza apenas registros com confirmação humana e sem alerta automático.
- **Alto — cobertura e unidade inconsistentes:** a devolutiva calculava temas com um subconjunto e cobertura territorial com todos os registros, além de ignorar que a ação vinculada podia ser uma roda. A versão proposta usa o mesmo subconjunto para a cobertura, classifica rodas pelo tipo da ação e retira uma seção que expunha identificadores de bairros sem resolver nomes ou avaliar grupos pequenos.
- **Alto — circulação sem aprovação:** o componente de síntese oferecia copiar uma “devolutiva pública” gerada de todos os registros sem revisão e ainda afirmava não conter dados identificáveis. Esta alteração remove esse atalho; os botões restantes são apresentados como síntese interna.
- **Alto — unidade de análise:** o atalho público contava registros como pessoas. Na consulta, 296 registros incluíam 31 relatos de roda (classificados por origem ou tipo da ação) e 265 registros individuais. Um registro não prova uma pessoa única. Outros painéis e exportações ainda precisam da mesma revisão.
- **Alto — denominador territorial:** 102 dos 265 registros individuais estavam sem bairro de referência (38,5%); 163 o informavam (61,5%). É cobertura de preenchimento, não representatividade populacional. Há 142 registros sem resumo da equipe e 10 sem prioridade informada, considerando todos os tipos.
- **Alto — critérios e privacidade:** detectar padrões de CPF, telefone, e-mail e endereço não garante anonimização. Falas, prioridades, lugares, ocupações e cruzamentos de pequenos grupos exigem revisão humana; não se deve inferir segurança apenas pela ausência de alerta automático.
- **Médio — relatório mensal:** listava todas as ações como realizadas mesmo quando calculava `actions.length` sem filtrar o status. Esta alteração descreve ações cadastradas e esclarece que a realização não está confirmada. O tratamento de status, datas e período em todos os formatos ainda deve ser harmonizado.
- **Médio — prontidão e sensibilidade:** a regra de prontidão aceitava 100% com status revisado antes de verificar alertas sensíveis. A alteração prioriza o alerta sensível; demais campos e relações ainda precisam de avaliação.
- **Médio — validade de período:** o formato anterior aceitava meses 00 e 13. A validação agora exige mês entre 01 e 12.
- **Médio — frequências:** palavras e prioridades repetidas dentro do mesmo registro podiam inflar os rankings e produzir percentuais superiores a 100%. A proposta conta cada termo no máximo uma vez por registro nos caminhos corrigidos; palavras da síntese de ação usam o campo de palavras e, se vazio, o texto livre. O método de coleta e as regras de corte continuam devendo acompanhar qualquer comparação entre painéis.

## Fluxos identificados

Síntese por ação: `components/actions/action-synthesis.tsx` e `lib/action-pilot.ts`; devolutiva: `lib/action-debriefs.ts` e tela de aprovação; relatório mensal: `lib/monthly-reports.ts` e sua tela; leituras coletivas: `lib/collective-readings.ts`; transparência: `lib/transparency-snapshots.ts` e rota `from-leituras`. A revisão não cobriu exaustivamente todas as telas, exportações e dados históricos.

## Validação executada e pendências

- Testes automatizados, TypeScript e lint foram executados; confirmação, invalidação e bloqueio de alteração indevida foram testados em transação revertida no banco, sem persistir dados de teste.
- A migração e o código ainda dependem de publicação coordenada e teste autenticado ponta a ponta. Os campos novos não recebem backfill, portanto as confirmações históricas precisam ser registradas pela equipe.
- A devolutiva aprovada anterior foi preservada; para ser considerada em novos snapshots deverá ser revisada e aprovada novamente após confirmação da ação e das fontes. Exportações anteriores e outros materiais externos precisam de conferência humana.
- Os detectores automáticos não garantem privacidade, e os dados de escuta não são amostra representativa da população. Lugares na geração de snapshot a partir de Leituras ficam omitidos até haver seleção consistente por período e revisão.

