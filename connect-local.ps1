# Script para conectar o bot localmente e escanear QR Code
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Conectar Bot Local - Escanear QR Code" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "1. Parar o bot no servidor" -ForegroundColor White
Write-Host "2. Deletar a sessão antiga" -ForegroundColor White
Write-Host "3. Iniciar o bot LOCALMENTE" -ForegroundColor White
Write-Host "4. Mostrar QR Code para escanear" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Deseja continuar? (s/n)"
if ($confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "1. Parando bot no servidor..." -ForegroundColor Yellow

$plink = "$env:TEMP\plink.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"

& $plink -i $ppk -hostkey $hostkey root@92.246.129.3 "pm2 stop chutai-bot"

Write-Host "   Bot parado!" -ForegroundColor Green
Write-Host ""
Write-Host "2. Deletando sessão antiga..." -ForegroundColor Yellow

& $plink -i $ppk -hostkey $hostkey root@92.246.129.3 "rm -rf /opt/chutai/auth_info_baileys"

Write-Host "   Sessão deletada!" -ForegroundColor Green
Write-Host ""
Write-Host "3. Iniciando bot LOCALMENTE..." -ForegroundColor Yellow
Write-Host "   O QR Code vai aparecer abaixo:" -ForegroundColor White
Write-Host ""

# Carregar variáveis de ambiente do .env.local se existir
$envPath = ".env"
if (Test-Path ".env.production") {
    $envPath = ".env.production"
}

Write-Host "Carregando variáveis de: $envPath" -ForegroundColor DarkGray
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^([^#].+?)=(.+)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

# Executar o bot localmente (desabilita checks de null estritos do TypeScript)
npx ts-node --transpileOnly src/bot.ts
