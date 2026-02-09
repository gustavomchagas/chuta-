# Script para criar túnel SSH para o banco de dados de produção
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Túnel SSH - Banco de Dados Produção" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script cria um túnel SSH para o PostgreSQL do servidor" -ForegroundColor Yellow
Write-Host ""
Write-Host "Depois de conectado, você pode:" -ForegroundColor Green
Write-Host "1. Abrir outro terminal" -ForegroundColor White
Write-Host "2. Rodar: npm run db:studio" -ForegroundColor White
Write-Host "3. Acessar: http://localhost:5555" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Configure a DATABASE_URL no .env antes:" -ForegroundColor Yellow
Write-Host 'DATABASE_URL="postgresql://usuario:senha@localhost:5432/database"' -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para encerrar o túnel" -ForegroundColor Yellow
Write-Host ""
Write-Host "Criando túnel..." -ForegroundColor Cyan

# Criar túnel SSH para PostgreSQL (porta 5432)
$plink = "$env:TEMP\plink.exe"
& $plink -i "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk" `
    -hostkey "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss" `
    -L 5432:localhost:5432 `
    -N `
    root@92.246.129.3
