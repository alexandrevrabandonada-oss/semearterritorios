# Template CSV da Lista Oficial de Territórios

Arquivo esperado: `supabase/seeds/neighborhoods.official.template.csv`

Colunas obrigatórias:

- `name`
- `city`
- `region`
- `aliases`
- `notes`
- `status`

Exemplo de formato:

```csv
name,city,region,aliases,notes,status
NOME OFICIAL DO TERRITORIO,CIDADE,REGIAO,apelido opcional,observacoes de validacao,oficial
OUTRO TERRITORIO,CIDADE,REGIAO,,observacoes adicionais,revisar
```

Regras:

- `name` e `city` são obrigatórios.
- `status` deve ser `oficial`, `provisorio`, `revisar` ou `nao_usar`.
- `aliases` pode conter mais de um nome separado por `|`.
- Não incluir endereço, nome de pessoa, dado de saúde identificável ou lugar sensível.
