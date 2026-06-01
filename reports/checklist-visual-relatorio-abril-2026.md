# Checklist visual - relatório mensal de abril de 2026

Data da validação autenticada: 20 de maio de 2026  
Rota validada: `/relatorios/2026-04`  
Ambiente local: `http://127.0.0.1:3077`  
Perfil usado no Chrome: Pessoa 1  
Resultado de acesso: sessão autenticada funcionou e o relatório carregou.

## Capturas

- `reports/screenshots/relatorio-abril-2026-interno.png`
- `reports/screenshots/relatorio-abril-2026-publico.png`

## Dados reais

| Item verificado | Status | Observação | Decisão |
|---|---:|---|---|
| Ações | Aprovado | Mostrou 2 ações | Conferido |
| Escutas | Aprovado | Mostrou 99 escutas | Conferido |
| Cobertura territorial | Aprovado | Mostrou 34.3% | Conferido |
| Escutas sem território de referência | Aprovado | Mostrou 65 no bloco territorial/metodológico | Conferido |
| Temas principais | Aprovado | ar/poluição, poder público, pó/sujeira, saúde e lixo/resíduos presentes | Conferido |
| Conclusão forte por bairro | Aprovado | Relatório mantém alerta de cobertura crítica | Não produzir conclusão territorial forte |

## Modo interno

| Item verificado | Status | Observação | Decisão |
|---|---:|---|---|
| Pendências operacionais | Aprovado | Card/painel interno visível | Manter no modo interno |
| Qualidade territorial | Aprovado | Nota metodológica e qualidade territorial visíveis | Manter |
| Ações sem fechamento | Aprovado | Alerta de ações sem dossiê fechado visível | Manter |
| Status de dossiê | Aprovado | Status aparece nos cards de ação | Manter |
| Status de devolutiva | Aprovado | Status aparece nos cards de ação | Manter |
| Alertas metodológicos | Aprovado | Cobertura crítica aparece com cautela | Manter |
| Encaminhamentos de revisão | Aprovado | Encaminhamentos visíveis no relatório | Manter |
| `undefined`, `NaN`, status cru, campo técnico | Aprovado | Não encontrados na varredura visual/DOM | Aprovado |

## Modo público

| Item verificado | Status | Observação | Decisão |
|---|---:|---|---|
| Leitura executiva | Aprovado | Presente | Manter |
| Temas dominantes | Aprovado | Presentes | Manter |
| Prioridades agrupadas | Aprovado | Presentes | Manter |
| Sinais qualitativos sanitizados | Aprovado | Presentes sem e-mail/CPF/telefone | Manter |
| Nota metodológica territorial | Aprovado | Presente e clara | Manter |
| Aprendizados | Aprovado | Presentes | Manter |
| Encaminhamentos públicos | Aprovado | Presentes sem linguagem de exposição individual | Manter |
| Pendências internas | Aprovado | Não aparecem após ajuste | Aprovado |
| CSV operacional | Aprovado | Não aparece no modo público | Aprovado |
| Status crus `draft/reviewed/published` | Aprovado | Não encontrados | Aprovado |
| Campos técnicos | Aprovado | Não encontrados | Aprovado |
| Fala original/transcrição individual | Aprovado | Não encontrada | Aprovado |
| Entrevistador, e-mail, CPF, telefone, endereço, anexos internos, auditoria interna | Aprovado | Não encontrados na varredura visual/DOM | Aprovado |

## PDF / impressão

O diálogo nativo de salvar PDF não foi automatizado. A folha de impressão (`print-sheet`) foi validada via DOM do navegador.

| Item verificado | Status | Observação | Decisão |
|---|---:|---|---|
| PDF interno - capa | Aprovado | Título e versão interna presentes na folha de impressão | Aprovado |
| PDF interno - indicadores | Aprovado | Ações, escutas e cobertura presentes | Aprovado |
| PDF interno - leitura executiva | Aprovado | Presente | Aprovado |
| PDF interno - nota metodológica | Aprovado | Presente | Aprovado |
| PDF interno - pendências internas | Aprovado | Presentes somente no interno | Aprovado |
| PDF interno - rodapé | Aprovado | Rodapé limpo presente | Aprovado |
| PDF público - visual institucional | Aprovado | Folha pública identifica versão pública | Aprovado |
| PDF público - pendências internas | Aprovado | Não aparecem | Aprovado |
| PDF público - dado sensível/status cru/campo técnico | Aprovado | Não encontrados no DOM de impressão | Aprovado |
| Páginas quase vazias, cards cortados, texto sobreposto | Parcial | Não verificável sem abrir diálogo/preview nativo de PDF | Conferir manualmente no preview de impressão antes de envio |

## Decisão

O relatório está aprovado para uso interno e aprovado para preparação de versão pública após revisão humana final no preview de impressão.

## Cautela territorial

Com 34,3% de cobertura territorial e 65 escutas sem território de referência, a versão pública não deve produzir conclusão forte por bairro. A nota metodológica deve permanecer visível em qualquer envio para UFF/APS/FEC.
