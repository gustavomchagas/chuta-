-- Remove palpites do jogador duplicado "Miller"
DELETE FROM bets WHERE player_id = 'eb55ad5a-a3ac-4c78-8550-6bfad6c5c956';

-- Remove o jogador duplicado "Miller"
DELETE FROM players WHERE id = 'eb55ad5a-a3ac-4c78-8550-6bfad6c5c956';

-- Verifica o resultado
SELECT 'Jogador "Miller" duplicado removido com sucesso!' as status;
SELECT id, name, phone FROM players ORDER BY name;
