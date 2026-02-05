# Script para Conectar WhatsApp Localmente e depois Subir para o Servidor
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Conectar WhatsApp - Metodo Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$plink = "$env:TEMP\plink.exe"
$pscp = "$env:TEMP\pscp.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$server = "root@92.246.129.3"

Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "1. Parar o bot no servidor" -ForegroundColor White
Write-Host "2. Rodar o bot AQUI no seu computador" -ForegroundColor White
Write-Host "3. Voce escaneia o QR Code que aparece normal" -ForegroundColor White
Write-Host "4. Copia os arquivos de autenticacao para o servidor" -ForegroundColor White
Write-Host "5. Reinicia o bot no servidor ja conectado" -ForegroundColor White
Write-Host ""
Write-Host "Pressione Enter para continuar ou Ctrl+C para cancelar..."
$null = Read-Host

# 1. Parar bot no servidor
Write-Host ""
Write-Host "[1/5] Parando bot no servidor..." -ForegroundColor Yellow
& $plink -i $ppk -hostkey $hostkey $server "cd /opt/chutai && pm2 stop chutai-bot"
Write-Host "Bot parado!" -ForegroundColor Green

# 2. Limpar autenticacao antiga (se existir)
Write-Host ""
Write-Host "[2/5] Limpando autenticacao antiga..." -ForegroundColor Yellow
if (Test-Path "auth_info_baileys") {
    Remove-Item -Recurse -Force "auth_info_baileys"
}
Write-Host "Pronto!" -ForegroundColor Green

# 3. Rodar bot localmente
Write-Host ""
Write-Host "[3/5] Iniciando bot LOCALMENTE..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  O QR Code vai aparecer AGORA!" -ForegroundColor Green
Write-Host "  Escaneie com seu WhatsApp!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Quando aparecer 'Conectado!' pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Seconds 3

# Rodar o bot
npm run bot

# Se chegou aqui, usuario pressionou Ctrl+C
Write-Host ""
Write-Host ""
Write-Host "[4/5] Copiando arquivos de autenticacao para o servidor..." -ForegroundColor Yellow

# Baixar pscp se necessario
if (-not (Test-Path $pscp)) {
    Write-Host "Baixando pscp..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" -OutFile $pscp
}

# Verificar se tem auth_info_baileys
if (Test-Path "auth_info_baileys") {
    # Copiar para o servidor
    & $pscp -i $ppk -hostkey $hostkey -r "auth_info_baileys" "${server}:/opt/chutai/"
    Write-Host "Arquivos copiados!" -ForegroundColor Green
    
    # 5. Reiniciar bot no servidor
    Write-Host ""
    Write-Host "[5/5] Reiniciando bot no servidor..." -ForegroundColor Yellow
    & $plink -i $ppk -hostkey $hostkey $server "cd /opt/chutai && pm2 start chutai-bot"
    Start-Sleep -Seconds 3
    & $plink -i $ppk -hostkey $hostkey $server "pm2 status"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Sucesso! Bot conectado no servidor!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Execute .\manage-server.ps1 logs para verificar" -ForegroundColor Cyan
}
else {
    Write-Host ""
    Write-Host "ERRO: Nao encontrei os arquivos de autenticacao!" -ForegroundColor Red
    Write-Host "O bot conectou? Tente novamente." -ForegroundColor Yellow
    
    # Reiniciar bot mesmo assim
    & $plink -i $ppk -hostkey $hostkey $server "cd /opt/chutai && pm2 start chutai-bot"
}
