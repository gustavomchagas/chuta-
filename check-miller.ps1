# Script para verificar e corrigir dados do Miller
$sshKey = "sa-saopaulo-1"
$server = "root@212.193.59.132"

Write-Host "🔍 Verificando jogadores 'Miller' no banco..." -ForegroundColor Cyan

# Buscar jogadores Miller
ssh -i $sshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL $server @"
psql -U chutai -d chutai -c \"SELECT id, name, phone, \\\"createdAt\\\" FROM \\\"User\\\" WHERE name LIKE '%Miller%' ORDER BY \\\"createdAt\\\";\"
"@

Write-Host ""
Write-Host "Verificando apostas de cada Miller..." -ForegroundColor Cyan

# Contar apostas por jogador
ssh -i $sshKey -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL $server @"
psql -U chutai -d chutai -c \"SELECT u.id, u.name, COUNT(b.id) as total_apostas FROM \\\"User\\\" u LEFT JOIN \\\"Bet\\\" b ON u.id = b.\\\"playerId\\\" WHERE u.name LIKE '%Miller%' GROUP BY u.id, u.name ORDER BY u.\\\"createdAt\\\";\"
"@
