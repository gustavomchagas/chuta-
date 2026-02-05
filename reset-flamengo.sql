UPDATE matches 
SET status = 'SCHEDULED', 
    home_score = NULL, 
    away_score = NULL 
WHERE home_team = 'Flamengo' AND round = 2;
