# Script simples para criar túnel SSH para o painel admin
Write-Host "Criando tunel SSH para o painel admin..." -ForegroundColor Cyan
Write-Host "Acesse: http://localhost:3334" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para encerrar" -ForegroundColor Yellow
Write-Host ""

# Abrir navegador
Start-Sleep -Seconds 2
Start-Process "http://localhost:3334"

# Criar túnel (mantém rodando)
$plink = "$env:TEMP\plink.exe"
& $plink -i "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk" `
    -hostkey "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss" `
    -L 3334:localhost:3334 `
    -N `
    root@92.246.129.3
