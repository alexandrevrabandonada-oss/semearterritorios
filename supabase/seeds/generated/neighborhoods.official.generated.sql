-- DEV/OPERACIONAL - Lista oficial preliminar de bairros de Volta Redonda.
-- Fonte: mapa_bairros_setores.pdf e mapa_tabela_bairros_setores.pdf, enviados para conferência.
-- NÃO EXECUTAR EM PRODUÇÃO SEM validação humana da APS/equipe territorial.
-- Este SQL NÃO apaga bairros existentes, NÃO executa limpeza e NÃO geocodifica.
-- O schema atual de public.neighborhoods não possui sector, region nem official_code.
-- Por isso, os metadados oficiais foram preservados em notes.

insert into public.neighborhoods (name, city, notes)
values
  ('Aero Clube', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=2; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Barreira Cravo', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=5; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Belo Horizonte', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=43; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Niterói', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=22; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Retiro', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=24; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('São João Batista', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=26; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Vila Brasília', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=39; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Vila Mury', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=40; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Voldac', 'Volta Redonda', 'status=oficial; setor=SCN; região=Setor Centro Norte; código_oficial=42; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Açude', 'Volta Redonda', 'status=oficial; setor=SO; região=Setor Oeste; código_oficial=1; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Belmonte', 'Volta Redonda', 'status=oficial; setor=SO; região=Setor Oeste; código_oficial=7; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Jardim Belmonte', 'Volta Redonda', 'status=oficial; setor=SO; região=Setor Oeste; código_oficial=50; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Jardim Padre Josimo Tavares', 'Volta Redonda', 'status=oficial; setor=SO; região=Setor Oeste; código_oficial=45; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Siderlândia', 'Volta Redonda', 'status=oficial; setor=SO; região=Setor Oeste; código_oficial=49; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Santa Cruz II', 'Volta Redonda', 'status=oficial; setor=SN; região=Setor Norte; código_oficial=48; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Candelária', 'Volta Redonda', 'status=oficial; setor=SN; região=Setor Norte; código_oficial=9; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Dom Bosco', 'Volta Redonda', 'status=oficial; setor=SN; região=Setor Norte; código_oficial=12; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Pinto da Serra', 'Volta Redonda', 'status=oficial; setor=SN; região=Setor Norte; código_oficial=47; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Santa Cruz', 'Volta Redonda', 'status=oficial; setor=SN; região=Setor Norte; código_oficial=44; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Santa Rita do Zarur', 'Volta Redonda', 'status=oficial; setor=SN; região=Setor Norte; código_oficial=33; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('São Luiz', 'Volta Redonda', 'status=oficial; setor=SN; região=Setor Norte; código_oficial=31; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Água Limpa', 'Volta Redonda', 'status=oficial; setor=SL; região=Setor Leste; código_oficial=3; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Brasilândia', 'Volta Redonda', 'status=oficial; setor=SL; região=Setor Leste; código_oficial=8; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Santo Agostinho', 'Volta Redonda', 'status=oficial; setor=SL; região=Setor Leste; código_oficial=34; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Três Poços', 'Volta Redonda', 'status=oficial; setor=SL; região=Setor Leste; código_oficial=37; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Vila Americana', 'Volta Redonda', 'status=oficial; setor=SL; região=Setor Leste; código_oficial=38; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Vila Rica', 'Volta Redonda', 'status=oficial; setor=SL; região=Setor Leste; código_oficial=46; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Casa de Pedra', 'Volta Redonda', 'status=oficial; setor=SS; região=Setor Sul; código_oficial=10; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Jardim Belvedere', 'Volta Redonda', 'status=oficial; setor=SS; região=Setor Sul; código_oficial=14; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Siderópolis', 'Volta Redonda', 'status=oficial; setor=SS; região=Setor Sul; código_oficial=36; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Aterrado', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=4; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Bela Vista', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=6; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Jardim Amália', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=15; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Jardim Paraíba', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=52; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Laranjal', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=18; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Monte Castelo', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=20; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Nossa Senhora das Graças', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=21; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('São Geraldo', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=28; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('São João', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=29; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Sessenta', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=35; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Vila Santa Cecília', 'Volta Redonda', 'status=oficial; setor=SCS; região=Setor Centro Sul; código_oficial=41; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Duzentos e Quarenta e Nove', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=51; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Conforto', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=11; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Eucaliptal', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=13; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Jardim Europa', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=16; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Jardim Suiça', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=17; fonte=mapa_bairros_setores.pdf; observação=conferir grafia/acento com APS antes de aplicar'),
  ('Minerlândia', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=19; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Ponte Alta', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=23; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Rústico', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=25; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('Santa Inez', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=32; fonte=mapa_bairros_setores.pdf; observação=conferir grafia com APS antes de aplicar'),
  ('São Cristóvão', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=27; fonte=mapa_bairros_setores.pdf; validar antes de aplicar'),
  ('São Lucas', 'Volta Redonda', 'status=oficial; setor=SSO; região=Setor Sudoeste; código_oficial=30; fonte=mapa_bairros_setores.pdf; validar antes de aplicar')
on conflict (name) do update
set
  city = excluded.city,
  notes = excluded.notes,
  updated_at = now();
