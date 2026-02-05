-- Limpa dados de teste mantendo os jogos cadastrados
TRUNCATE TABLE bets CASCADE;
TRUNCATE TABLE players CASCADE;
TRUNCATE TABLE groups CASCADE;
TRUNCATE TABLE notifications CASCADE;

-- Mensagem de confirmação
SELECT 'Dados de teste limpos! Jogos mantidos.' as status;
