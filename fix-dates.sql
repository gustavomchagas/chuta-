-- Corrigir datas dos jogos cadastrados (estão em UTC, precisam estar em horário de Brasília)
-- Os jogos foram cadastrados como se fossem UTC, mas são horários de Brasília

-- Jogos de 04/02 às 19h BRT = 22h UTC
UPDATE matches SET match_date = '2026-02-04 22:00:00' WHERE home_team = 'Flamengo' AND round = 2;
UPDATE matches SET match_date = '2026-02-04 22:00:00' WHERE home_team = 'Bragantino' AND round = 2;

-- Jogos de 04/02 às 20h BRT = 23h UTC  
UPDATE matches SET match_date = '2026-02-04 23:00:00' WHERE home_team = 'Santos' AND round = 2;
UPDATE matches SET match_date = '2026-02-04 23:00:00' WHERE home_team = 'Remo' AND round = 2;

-- Jogos de 04/02 às 21h30 BRT = 05/02 00:30 UTC
UPDATE matches SET match_date = '2026-02-05 00:30:00' WHERE home_team = 'Grêmio' AND round = 2;
UPDATE matches SET match_date = '2026-02-05 00:30:00' WHERE home_team = 'Palmeiras' AND round = 2;

-- Jogos de 05/02 às 19h BRT = 22h UTC
UPDATE matches SET match_date = '2026-02-05 22:00:00' WHERE home_team = 'Bahia' AND round = 2;

-- Jogos de 05/02 às 20h BRT = 23h UTC
UPDATE matches SET match_date = '2026-02-05 23:00:00' WHERE home_team = 'Vasco da Gama' AND round = 2;

-- Jogos de 05/02 às 21h30 BRT = 06/02 00:30 UTC
UPDATE matches SET match_date = '2026-02-06 00:30:00' WHERE home_team = 'Cruzeiro' AND round = 2;

-- Jogos de 19/02 às 19h30 BRT = 22:30 UTC
UPDATE matches SET match_date = '2026-02-19 22:30:00' WHERE home_team = 'Athletico-PR' AND round = 2;
