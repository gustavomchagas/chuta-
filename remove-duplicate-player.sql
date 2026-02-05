-- Lista os jogadores para verificar IDs
SELECT id, name, phone FROM players ORDER BY name;

-- Para executar a remoção, descomente as linhas abaixo após verificar o ID correto:
-- DELETE FROM bets WHERE player_id = 'ID_DO_JOGADOR_MILLER';
-- DELETE FROM players WHERE name = 'Miller';

SELECT 'Execute os comandos DELETE manualmente após verificar os IDs' as instrucao;
