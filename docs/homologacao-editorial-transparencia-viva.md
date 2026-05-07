# Homologação editorial da Transparência Viva

## Escopo

Validar trilha de auditoria editorial, versionamento, comentários, bloqueios de publicação e acoplamento com o pacote institucional da Transparência Viva.

## Pré-condições

- migrations aplicadas até `20260506223000_add_transparency_homologation_packages.sql`;
- usuário `equipe` autenticado;
- usuário `coordenacao` ou `admin` autenticado;
- pelo menos um snapshot de teste em `draft`.

## Testes manuais

1. criar snapshot `draft`;
2. editar o texto público;
3. marcar `reviewed`;
4. confirmar que uma nova versão foi criada;
5. adicionar comentário do tipo `privacidade`;
6. tentar publicar com comentário pendente;
7. confirmar bloqueio;
8. resolver o comentário;
9. aprovar e publicar;
10. confirmar que a API pública retorna apenas `published`;
11. editar o snapshot publicado;
12. confirmar retorno para `reviewed`;
13. confirmar que nova versão foi criada no retorno para revisão;
14. gerar pacote institucional a partir do snapshot aprovado.

## Resultado esperado

- versões registram status, data, autor e motivo;
- comentários críticos (`privacidade`, `dados`, `metodologia`) bloqueiam publicação;
- comentários de `texto` não bloqueiam sozinhos, mas ficam sinalizados;
- pacote de homologação pode ser criado sem expor dado bruto;
- `anon` continua sem acesso às tabelas internas de auditoria e homologação.
