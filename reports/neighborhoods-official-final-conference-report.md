# Conferência final da lista oficial de bairros de Volta Redonda

Data da conferência: 2026-05-04

Arquivos conferidos:
- `supabase/seeds/neighborhoods.official.csv`
- `C:/Users/Micro/Downloads/mapa_tabela_bairros_setores.pdf`
- `C:/Users/Micro/Downloads/mapa_bairros_setores.pdf`

Resultado: **CSV preliminar coerente com a tabela oficial visível nos PDFs, pronto para revisão humana da APS/equipe territorial.**

## Método usado

Os PDFs foram verificados como arquivos baseados em imagem/scan. A extração textual automática não retornou conteúdo útil, e o ambiente local não possui OCR instalado. A conferência foi feita por inspeção visual dos recortes de imagem embutidos no PDF `mapa_bairros_setores.pdf`, com apoio de ampliação dos trechos da tabela.

O arquivo `mapa_tabela_bairros_setores.pdf` foi usado como fonte complementar, mas a relação tabular legível foi conferida principalmente nos recortes extraídos de `mapa_bairros_setores.pdf`.

## Validações executadas

- Total de bairros no CSV: **52**.
- Total esperado indicado na tabela oficial: **52**.
- Códigos oficiais preenchidos: **52/52**.
- Faixa de códigos: **1 a 52**.
- Duplicidade de `official_code`: **nenhuma**.
- Duplicidade exata de `name`: **nenhuma**.
- Campo `city`: **todos com Volta Redonda**.
- Campo `status`: **todos com oficial**.
- Linhas `TOTAL`: **não incluídas**.
- Linhas `SUBTOTAL`: **não incluídas**.
- Linha `NÃO ESPECIFICADO`: **não incluída**.
- Observações e rodapés: **não incluídos como bairro**.
- Dados pessoais, endereços ou geocodificação: **não incluídos**.

## Distribuição por setor

| Setor | Região | Total no CSV |
| --- | --- | ---: |
| SCN | Setor Centro Norte | 9 |
| SO | Setor Oeste | 5 |
| SN | Setor Norte | 7 |
| SL | Setor Leste | 6 |
| SS | Setor Sul | 3 |
| SCS | Setor Centro Sul | 11 |
| SSO | Setor Sudoeste | 11 |
| **Total** |  | **52** |

## Lista conferida por setor

### SCN - Setor Centro Norte

| Código | Bairro |
| ---: | --- |
| 2 | Aero Clube |
| 5 | Barreira Cravo |
| 43 | Belo Horizonte |
| 22 | Niterói |
| 24 | Retiro |
| 26 | São João Batista |
| 39 | Vila Brasília |
| 40 | Vila Mury |
| 42 | Voldac |

### SO - Setor Oeste

| Código | Bairro |
| ---: | --- |
| 1 | Açude |
| 7 | Belmonte |
| 50 | Jardim Belmonte |
| 45 | Jardim Padre Josimo Tavares |
| 49 | Siderlândia |

### SN - Setor Norte

| Código | Bairro |
| ---: | --- |
| 48 | Santa Cruz II |
| 9 | Candelária |
| 12 | Dom Bosco |
| 47 | Pinto da Serra |
| 44 | Santa Cruz |
| 33 | Santa Rita do Zarur |
| 31 | São Luiz |

### SL - Setor Leste

| Código | Bairro |
| ---: | --- |
| 3 | Água Limpa |
| 8 | Brasilândia |
| 34 | Santo Agostinho |
| 37 | Três Poços |
| 38 | Vila Americana |
| 46 | Vila Rica |

### SS - Setor Sul

| Código | Bairro |
| ---: | --- |
| 10 | Casa de Pedra |
| 14 | Jardim Belvedere |
| 36 | Siderópolis |

Observação: o rodapé do PDF menciona áreas em processo de transição no Setor Sul. Essas linhas não foram incluídas como bairros oficiais no CSV, pois não aparecem como linhas regulares da tabela de bairros com código oficial.

### SCS - Setor Centro Sul

| Código | Bairro |
| ---: | --- |
| 4 | Aterrado |
| 6 | Bela Vista |
| 15 | Jardim Amália |
| 52 | Jardim Paraíba |
| 18 | Laranjal |
| 20 | Monte Castelo |
| 21 | Nossa Senhora das Graças |
| 28 | São Geraldo |
| 29 | São João |
| 35 | Sessenta |
| 41 | Vila Santa Cecília |

### SSO - Setor Sudoeste

| Código | Bairro |
| ---: | --- |
| 51 | Duzentos e Quarenta e Nove |
| 11 | Conforto |
| 13 | Eucaliptal |
| 16 | Jardim Europa |
| 17 | Jardim Suiça |
| 19 | Minerlândia |
| 23 | Ponte Alta |
| 25 | Rústico |
| 32 | Santa Inez |
| 27 | São Cristóvão |
| 30 | São Lucas |

## Nomes com acento conferidos

Foram preservados no CSV os nomes acentuados legíveis na tabela, incluindo:
- Açude
- Niterói
- São João Batista
- Vila Brasília
- Candelária
- Santa Rita do Zarur
- Água Limpa
- Brasilândia
- Santo Agostinho
- Três Poços
- Siderópolis
- Jardim Amália
- Jardim Paraíba
- Nossa Senhora das Graças
- São Geraldo
- São João
- Vila Santa Cecília
- Minerlândia
- Rústico
- São Cristóvão
- São Lucas

## Pontos para conferência humana

Por se tratar de PDF escaneado, recomenda-se conferência humana antes de aplicação no banco. Dois nomes foram marcados no próprio CSV com observação específica:

- `Jardim Suiça`: a grafia foi lida no PDF como `Jardim Suiça`. Conferir se a grafia oficial atual deve permanecer assim ou se a APS deseja padronizar como `Jardim Suíça`.
- `Santa Inez`: a grafia foi lida no PDF como `Santa Inez`. Conferir se a grafia oficial atual mantém `z`.

Esses pontos não bloqueiam a revisão, mas devem ser validados pela APS/equipe territorial antes de transformar a lista em base oficial aplicada.

## SQL gerado

Arquivo gerado:
- `supabase/seeds/generated/neighborhoods.official.generated.sql`

O SQL gerado:
- faz `insert ... on conflict (name) do update`;
- não apaga bairros existentes;
- não executa limpeza;
- não altera vínculos;
- não geocodifica;
- não aplica a lista no banco remoto.

O schema atual de `public.neighborhoods` possui `name`, `city` e `notes`, mas não possui campos estruturados para `sector`, `region` ou `official_code`. Por isso, o SQL preserva esses metadados no campo `notes`. Se a equipe quiser consultar setor e código de forma estruturada, recomenda-se criar uma migration separada antes da aplicação oficial.

## Recomendação

Recomendação técnica: **revisar com a APS/equipe territorial antes de aplicar no banco**.

A lista está consistente com a tabela conferida visualmente e atende ao total de 52 bairros, mas a origem escaneada exige validação humana formal para reduzir risco de erro de transcrição.

Não aplicar em produção antes de:
- validar `Jardim Suiça`;
- validar `Santa Inez`;
- decidir se `sector`, `region` e `official_code` serão campos estruturados;
- registrar aprovação da APS/equipe territorial.

CSV gerado para revisão humana. A aplicação no banco deve ocorrer apenas após validação da APS/equipe territorial.
