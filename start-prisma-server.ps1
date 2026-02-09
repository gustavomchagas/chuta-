# Script para iniciar Prisma Studio no servidor
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciar Prisma Studio no Servidor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$plink = "$env:TEMP\plink.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$server = "root@92.246.129.3"

Write-Host "1. Conectando ao servidor..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: O Prisma Studio vai rodar no servidor" -ForegroundColor Yellow
Write-Host "Deixe este terminal aberto enquanto estiver usando" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para acessar:" -ForegroundColor Green
Write-Host "  1. Deixe este script rodando" -ForegroundColor White
Write-Host "  2. Em outro terminal execute: .\tunnel-prisma.ps1" -ForegroundColor White
Write-Host "  3. Acesse: http://localhost:5555" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o Prisma Studio" -ForegroundColor Yellow
Write-Host ""
Write-Host "Iniciando..." -ForegroundColor Cyan

# Executar Prisma Studio no servidor
& $plink -i $ppk -hostkey $hostkey $server "cd /opt/chutai && npx prisma studio"
