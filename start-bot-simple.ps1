# Script para iniciar bot e mostrar QR Code
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Bot - Aguardando QR Code" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se há sessão antiga
if (Test-Path "auth_info_baileys") {
    Write-Host "⚠️  Existe pasta auth_info_baileys" -ForegroundColor Yellow
    Write-Host "Deseja deletar para forçar novo QR Code? (s/n)" -ForegroundColor Yellow
    $del = Read-Host
    if ($del -eq "s") {
        Remove-Item -Recurse -Force auth_info_baileys
        Write-Host "✅ Sessão deletada!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Iniciando bot..." -ForegroundColor Green
Write-Host "O QR Code deve aparecer abaixo em alguns segundos..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Red
Write-Host ""

# Carrega variáveis de ambiente
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

# Inicia o bot
npx ts-node --transpileOnly src/bot.ts