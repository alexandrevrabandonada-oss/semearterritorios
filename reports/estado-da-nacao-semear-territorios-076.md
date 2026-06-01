# Estado da Nação - SEMEAR Territórios - Tijolo 076

## Objetivo

Validar visualmente, em sessão autenticada, o relatório mensal interpretativo de abril de 2026 na rota `/relatorios/2026-04`, incluindo modo interno, modo público, PDF interno e PDF público.

## Rota validada

Rota alvo: `/relatorios/2026-04`  
Ambiente local usado: `http://127.0.0.1:3076`

Resultado:

- navegador interno: redirecionou para `http://127.0.0.1:3076/login`;
- Chrome: redirecionou para `http://127.0.0.1:3076/login`.

A rota está protegida por autenticação e não carregou os dados reais nesta sessão.

## Usuário/perfil usado

- Navegador interno Codex: sem sessão autenticada do SEMEAR.
- Chrome: perfil `Pessoa 1`, extensão Codex conectada, mas sem sessão autenticada no SEMEAR.

Nenhuma credencial foi solicitada, inserida ou contornada.

## Dados reais conferidos

Status: não conferidos visualmente.

Motivo: os dados reais não carregaram porque a rota redirecionou para login.

Cenário esperado para validação posterior:

- 2 ações;
- 99 escutas;
- 34,3% de cobertura territorial;
- 65 escutas sem território de referência;
- temas principais: ar/poluição, poder público, pó/sujeira, saúde e lixo/resíduos.

Esses dados já estavam cobertos por teste determinístico no Tijolo 075, mas o Tijolo 076 exigia validação visual autenticada com dados reais, que segue pendente.

## Modo interno

Status: não validado visualmente.

Itens ainda pendentes de conferência após login:

- pendências operacionais;
- qualidade territorial;
- ações sem dossiê fechado;
- status de dossiê;
- status de devolutiva;
- alertas metodológicos;
- encaminhamentos de revisão;
- ausência de `undefined`, `NaN`, status cru e campo técnico.

## Modo público

Status: não validado visualmente.

Itens ainda pendentes de conferência após login:

- ausência de pendências internas;
- ausência de CSV operacional;
- ausência de status cru como `draft`, `reviewed` ou `published`;
- ausência de campo técnico;
- ausência de fala original bruta;
- ausência de entrevistador, e-mail, CPF, telefone, endereço e anexos internos;
- presença de leitura executiva, temas dominantes, prioridades agrupadas, sinais qualitativos sanitizados, nota metodológica, aprendizados e encaminhamentos públicos.

## PDF interno

Status: não gerado.

Motivo: o relatório real não carregou por ausência de sessão autenticada. Não foi gerado PDF de tela de login porque isso não atende ao objetivo da validação.

## PDF público

Status: não gerado.

Motivo: o relatório real não carregou por ausência de sessão autenticada. A validação de PDF público segue pendente após login.

## Checklist visual

Documento criado:

- `reports/checklist-visual-relatorio-abril-2026.md`

Decisão do checklist: bloqueado por ausência de sessão autenticada.

## Decisão humana

Documento criado:

- `reports/decisao-humana-relatorio-abril-2026.md`

Decisão registrada:

- precisa ajuste ou validação complementar.

A decisão não aprova publicação nem envio externo.

## Resultado do verify

Verificação final executada com sucesso:

- `npm run lint`: passou;
- `npm run build`: passou;
- `npm run verify`: passou;
- `test:reports`: 4 testes passaram;
- `test:transparencia`: 14 testes passaram.

## Pendências restantes

1. Fazer login com usuário autorizado no SEMEAR Territórios.
2. Abrir `http://127.0.0.1:3076/relatorios/2026-04`.
3. Conferir visualmente dados reais.
4. Capturar screenshots internas e públicas, se possível:
   - `reports/screenshots/relatorio-abril-2026-interno.png`;
   - `reports/screenshots/relatorio-abril-2026-publico.png`.
5. Gerar ou revisar PDF interno.
6. Gerar ou revisar PDF público.
7. Atualizar a decisão humana.

## Cautela territorial

Mesmo após autenticação, a validação deve manter a regra metodológica: com 34,3% de cobertura territorial e 65 escutas sem território de referência, o relatório não deve produzir conclusão forte por bairro.

## Escopo preservado

Não houve:

- nova análise;
- IA;
- OCR;
- mapa;
- alteração de schema;
- alteração de RLS;
- publicação automática;
- exposição de dado sensível.
