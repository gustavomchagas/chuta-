-- Restaura os 10 jogos da rodada 2

INSERT INTO matches (id, group_id, round, home_team, away_team, match_date, home_score, away_score, status, created_at, updated_at)
VALUES 
-- Quarta-feira, 04/02
('7b81fddf-afc7-46b1-92f8-4822fe10ed57', NULL, 2, 'Bragantino', 'Atlético-MG', '2026-02-04 22:00:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),
('58bcedc7-f97b-4c4a-a6fe-63706cd9167b', NULL, 2, 'Flamengo', 'Internacional', '2026-02-04 22:00:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),
('252e212b-b6d0-4c8f-8623-fc84b676c4b6', NULL, 2, 'Santos', 'São Paulo', '2026-02-04 23:00:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),
('ed64bcff-83dd-4aa8-91ce-10d5fb5c17d7', NULL, 2, 'Remo', 'Mirassol', '2026-02-04 23:00:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),
('8275fc85-1e08-4d6c-b0ab-e88ba85a54b1', NULL, 2, 'Palmeiras', 'Vitória', '2026-02-05 00:30:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),
('9a123456-1234-5678-90ab-cdef12345678', NULL, 2, 'Grêmio', 'Botafogo', '2026-02-05 00:30:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),

-- Quinta-feira, 05/02
('1b234567-2345-6789-01bc-def234567890', NULL, 2, 'Bahia', 'Fluminense', '2026-02-05 22:00:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),
('2c345678-3456-7890-12cd-ef3456789012', NULL, 2, 'Vasco da Gama', 'Chapecoense', '2026-02-05 23:00:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),
('3d456789-4567-8901-23de-f45678901234', NULL, 2, 'Cruzeiro', 'Coritiba', '2026-02-06 00:30:00', NULL, NULL, 'SCHEDULED', NOW(), NOW()),

-- Adiado para 19/02
('4e567890-5678-9012-34ef-567890123456', NULL, 2, 'Athletico-PR', 'Corinthians', '2026-02-19 22:30:00', NULL, NULL, 'SCHEDULED', NOW(), NOW());

SELECT 'Jogos restaurados com sucesso!' as status;
