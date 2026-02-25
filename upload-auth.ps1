# Script para fazer upload das credenciais e reiniciar o bot
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upload Credenciais e Reiniciar Bot" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "1. Comprimir a pasta auth_info_baileys" -ForegroundColor White
Write-Host "2. Fazer upload para o servidor" -ForegroundColor White
Write-Host "3. Reiniciar o bot no servidor" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Deseja continuar? (s/n)"
if ($confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit
}

$plink = "$env:TEMP\plink.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"

# Verificar se a pasta existe
if (-not (Test-Path "auth_info_baileys")) {
    Write-Host ""
    Write-Host "ERRO: Pasta auth_info_baileys não encontrada!" -ForegroundColor Red
    Write-Host "Execute connect-local.ps1 primeiro para escanear o QR Code." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "1. Comprimindo auth_info_baileys..." -ForegroundColor Yellow

# Criar arquivo temporário zip
$zipPath = "$env:TEMP\auth_info_baileys.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path "auth_info_baileys\*" -DestinationPath $zipPath -Force

Write-Host "   Comprimido: $zipPath" -ForegroundColor Green
Write-Host ""
Write-Host "2. Fazendo upload para o servidor..." -ForegroundColor Yellow

# Upload usando pscp
$pscp = "$env:TEMP\pscp.exe"
& $pscp -i $ppk -P 22 $zipPath "root@92.246.129.3:/tmp/"

Write-Host "   Upload concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "3. Extraindo no servidor..." -ForegroundColor Yellow

& $plink -i $ppk -hostkey $hostkey root@92.246.129.3 @"
cd /opt/chutai
rm -rf auth_info_baileys
unzip -o /tmp/auth_info_baileys.zip -d auth_info_baileys
rm /tmp/auth_info_baileys.zip
echo "Credenciais extraídas com sucesso!"
"@

Write-Host "   Extração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "4. Reiniciando o bot..." -ForegroundColor Yellow

& $plink -i $ppk -hostkey $hostkey root@92.246.129.3 "pm2 restart chutai-bot"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Bot Reiniciado!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verificando status..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

& $plink -i $ppk -hostkey $hostkey root@92.246.129.3 "pm2 status"

Write-Host ""
Write-Host "Verifique o bot no grupo do WhatsApp!" -ForegroundColor Green