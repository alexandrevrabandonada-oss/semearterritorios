# Homologação do pacote institucional da Transparência Viva

## Escopo

Validar criação, congelamento, bloqueios e assinatura do pacote institucional da Transparência Viva.

## Pré-condições

- migrations aplicadas até `20260506223000_add_transparency_homologation_packages.sql`;
- um snapshot de teste já aprovado;
- usuário `coordenacao` ou `admin` autenticado;
- comentários de teste disponíveis para validar bloqueios.

## Testes manuais

1. criar snapshot;
2. revisar checklist editorial;
3. aprovar snapshot;
4. gerar pacote institucional;
5. validar `frozen_payload`;
6. criar ou manter pendência crítica;
7. tentar assinar com pendência crítica;
8. confirmar bloqueio;
9. resolver pendência;
10. assinar pacote;
11. copiar Markdown institucional;
12. abrir preview print;
13. confirmar ausência de dado bruto ou sensível.

## Resultado esperado

- pacote recebe `package_code` legível;
- `frozen_payload` contém apenas campos públicos e sanitizados;
- assinatura falha com comentário crítico, risco bloqueante ou checklist incompleto;
- assinatura bem-sucedida registra responsável, data e decisão;
- preview print permanece limpo e sem dado sensível.
