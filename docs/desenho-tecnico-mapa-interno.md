# Desenho Técnico — Mapa Interno Autenticado

## 1. Objetivo do mapa interno

O mapa interno será uma ferramenta autenticada para leitura territorial agregada do SEMEAR Territórios. Ele deve apoiar coordenação e equipe na comparação entre bairros, temas recorrentes, intensidade de escutas e qualidade territorial dos dados.

O mapa interno não é:

- mapa público;
- mapa de denúncias individuais;
- mapa de pessoas;
- mapa de endereços;
- substituto da devolutiva revisada ou do dossiê.

## 2. Usuários previstos

- Admin: acompanha visão geral, valida regras e apoia governança.
- Coordenação: decide uso institucional, aprova critérios e acompanha riscos.
- Equipe: consulta padrões territoriais e revisa dados.
- Leitor, se um dia existir formalmente: apenas leitura autenticada e sanitizada.

## 3. Dados permitidos

- Bairros/territórios.
- Total de escutas por bairro.
- Temas agregados por bairro.
- Intensidade de escuta por bairro.
- Lugares normalizados com `visibility = internal` ou `visibility = public_safe`.
- Status de qualidade territorial.
- Status de normalização.
- Badges de prontidão para mapa interno.

## 4. Dados proibidos

- Fala original completa.
- Nome de entrevistador, se não for estritamente necessário.
- CPF.
- Telefone.
- E-mail.
- Endereço pessoal.
- Dados de saúde individual.
- Lugar com `visibility = sensitive`.
- `place_type = sensivel_nao_publicar`.
- Qualquer dado que identifique pessoa, família ou casa.

## 5. Fontes de dados

- `neighborhoods`: bairros/territórios.
- `listening_records`: contagem, status de revisão, data, tipo de fonte e bairro.
- `listening_record_themes`: vínculo entre escutas e temas.
- `themes`: nomes dos temas.
- `places_mentioned`: menções estruturadas a lugares.
- `normalized_places`: nomes padronizados e visibilidade.
- `action_debriefs`: status da devolutiva, quando o recorte for por ação.
- `action_closures`: status do dossiê, quando o recorte for por ação.

## 6. Regras de agregação

- Agregação principal por bairro/território.
- Contagem de escutas totais e revisadas.
- Temas mais recorrentes por bairro.
- Lugares normalizados citados por bairro.
- Status de qualidade territorial por bairro.
- Status de prontidão para mapa.
- Filtros previstos:
  - mês;
  - tema;
  - bairro;
  - tipo de ação;
  - status de revisão;
  - qualidade territorial.

## 7. Regras de privacidade

- Mapa interno autenticado.
- Sem acesso anônimo.
- Sem página pública.
- Sem geocodificação de endereço.
- Sem precisão falsa.
- Lugares sensíveis sempre ocultos.
- Lugares `sensivel_nao_publicar` sempre ocultos.
- Alerta quando território não tiver qualidade suficiente.
- Nenhuma fala original entra no mapa.

## 8. Estados do mapa

- Sem dados: nenhum registro territorial no recorte.
- Dados insuficientes: menos de 20 escutas revisadas ou menos de 3 territórios.
- Dados em revisão: há revisão territorial pendente, lugares sem normalização ou duplicidade.
- Pronto para mapa interno: critérios técnicos atendidos para desenho/protótipo.
- Bloqueado por sensível: há lugar sensível ou possível dado sensível pendente.
- Pronto para devolutiva agregada: dados revisados, sem sensíveis e com recorte seguro para síntese pública agregada.

## 9. UX prevista

- Alternar entre mapa-lista e futuro mapa visual.
- Cards por bairro com escutas, temas e lugares seguros.
- Painel lateral de território selecionado.
- Filtros por mês, tema, bairro e tipo de ação.
- Legenda de intensidade.
- Badges de qualidade territorial e normalização.
- Botão “copiar síntese territorial”.
- Alertas visíveis para dados em revisão e bloqueios de privacidade.

## 10. Critérios GO/NO-GO

GO para protótipo:

- 20+ escutas revisadas.
- 3+ territórios com dados.
- Revisão territorial concluída.
- Lugares estruturados normalizados.
- Sem lugares sensíveis pendentes.
- Sem duplicidades relevantes.
- RLS validada manualmente no banco aplicado.
- Devolutiva aprovada e dossiê fechado quando o recorte for uma ação principal.

NO-GO por dados insuficientes:

- menos de 20 escutas revisadas;
- menos de 3 territórios;
- revisão territorial pendente.

NO-GO por sensível:

- lugar `visibility = sensitive`;
- `place_type = sensivel_nao_publicar`;
- possível dado pessoal pendente.

NO-GO por duplicidade:

- nomes normalizados parecidos sem decisão;
- nomes ambíguos entre bairros sem revisão.

NO-GO por RLS não validada:

- policies não testadas no banco aplicado;
- acesso anônimo não validado como bloqueado;
- risco de leitura além do papel autenticado.
