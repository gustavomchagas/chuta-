# Script para atualizar o smartBot.ts e reiniciar o bot do WhatsApp

$Key = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$HostKey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$Server = "root@92.246.129.3"
$LocalPath = "c:\dev\Chutaí"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Atualizando smartBot.ts" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Envia smartBot.ts atualizado
Write-Host "Enviando smartBot.ts..." -ForegroundColor Yellow
& "$env:TEMP\pscp.exe" -i $Key -hostkey $HostKey "$LocalPath\src\whatsapp\smartBot.ts" "$Server`:/opt/chutai/src/whatsapp/smartBot.ts"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Arquivo enviado com sucesso!" -ForegroundColor Green
}
else {
    Write-Host "✗ Erro ao enviar arquivo" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Reiniciando chutai-bot..." -ForegroundColor Yellow

# Reinicia o bot
& "$env:TEMP\plink.exe" -i $Key -hostkey $HostKey $Server "pm2 restart chutai-bot"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Bot reiniciado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verificando status..." -ForegroundColor Cyan
    & "$env:TEMP\plink.exe" -i $Key -hostkey $HostKey $Server "pm2 status chutai-bot"
}
else {
    Write-Host "✗ Erro ao reiniciar bot" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  Deploy Concluído!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green