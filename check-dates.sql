SELECT 
  home_team, 
  match_date as utc_time,
  match_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as brt_time
FROM matches 
WHERE round = 2 
ORDER BY match_date;
