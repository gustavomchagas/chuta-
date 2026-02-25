# Script de deploy rápido para atualização do bot
# Baseado no modelo que já funciona

$Key = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$HostKey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$Server = "root@92.246.129.3"
# Usa o diretório atual para evitar problemas com caracteres especiais
$CurrentDir = Get-Location

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deploy - Atualização do Bot" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Envia smartBot.ts (comando !resultados e formato melhorado)
Write-Host "[1/3] Enviando smartBot.ts..." -ForegroundColor Yellow
& "$env:TEMP\pscp.exe" -i $Key -hostkey $HostKey "$CurrentDir\src\whatsapp\smartBot.ts" "$Server`:/opt/chutai/src/whatsapp/smartBot.ts"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ smartBot.ts enviado com sucesso!" -ForegroundColor Green
}
else {
    Write-Host "✗ Erro ao enviar smartBot.ts" -ForegroundColor Red
    exit 1
}

# Envia admin.ts (correções de tipo)
Write-Host "[2/3] Enviando admin.ts..." -ForegroundColor Yellow
& "$env:TEMP\pscp.exe" -i $Key -hostkey $HostKey "$CurrentDir\src\admin.ts" "$Server`:/opt/chutai/src/admin.ts"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ admin.ts enviado com sucesso!" -ForegroundColor Green
}
else {
    Write-Host "✗ Erro ao enviar admin.ts" -ForegroundColor Red
    exit 1
}

# Envia sofascore.ts (correções de status)
Write-Host "[3/3] Enviando sofascore.ts..." -ForegroundColor Yellow
& "$env:TEMP\pscp.exe" -i $Key -hostkey $HostKey "$CurrentDir\src\services\sofascore.ts" "$Server`:/opt/chutai/src/services/sofascore.ts"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ sofascore.ts enviado com sucesso!" -ForegroundColor Green
}
else {
    Write-Host "✗ Erro ao enviar sofascore.ts" -ForegroundColor Red
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
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  Deploy Concluído!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
}
else {
    Write-Host "✗ Erro ao reiniciar bot" -ForegroundColor Red
    exit 1
}