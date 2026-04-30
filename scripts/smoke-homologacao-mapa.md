# Smoke Documental — Homologação do Mapa Interno

Este smoke é manual. Ele não substitui RLS no banco nem cria dados automaticamente.

## Preparação

- [ ] Ambiente definido: dev / staging / produção controlada.
- [ ] Migrations aplicadas.
- [ ] Usuários admin, coordenação e equipe disponíveis.
- [ ] Dados reais ou simulados suficientes disponíveis.
- [ ] Documentos abertos:
  - `docs/checklist-homologacao-real-mapa.md`
  - `docs/teste-manual-rls-mapa.md`
  - `docs/evidencias-homologacao-mapa.md`

## Execução

- [ ] Acessar como admin.
- [ ] Abrir `/territorios/mapa/homologacao`.
- [ ] Criar ou atualizar rascunho de homologação.
- [ ] Acessar como coordenação.
- [ ] Confirmar que coordenação consegue aprovar/rejeitar quando os critérios estão atendidos.
- [ ] Acessar como equipe.
- [ ] Confirmar que equipe não consegue aprovar/rejeitar.
- [ ] Testar usuário anônimo.
- [ ] Confirmar bloqueio ou redirecionamento em `/mapa`.
- [ ] Confirmar bloqueio ou redirecionamento em `/mapa/interno`.
- [ ] Confirmar bloqueio ou redirecionamento em `/territorios/mapa/homologacao`.
- [ ] Verificar `/mapa/interno` bloqueado antes do GO.
- [ ] Copiar relatório de qualidade territorial.
- [ ] Copiar relatório de qualidade da normalização.
- [ ] Aprovar homologação apenas se critérios reais forem atendidos.
- [ ] Verificar `/mapa/interno` autorizado após aprovação com `go_prototipo_interno`.

## Resultado

- [ ] Smoke aprovado.
- [ ] Smoke bloqueado.
- [ ] Repetir após ajustes.

Pendências:

Responsável:

Data:
