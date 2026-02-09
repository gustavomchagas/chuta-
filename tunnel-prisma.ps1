# Script para criar tunel SSH para o Prisma Studio
Write-Host "Criando tunel SSH para o Prisma Studio..." -ForegroundColor Cyan
Write-Host "Acesse: http://localhost:5555" -ForegroundColor Green
Write-Host "Pressione Ctrl+C para encerrar" -ForegroundColor Yellow
Write-Host ""

# Abrir navegador
Start-Sleep -Seconds 2
Start-Process "http://localhost:5555"

# Criar tunel (mantem rodando)
$plink = "$env:TEMP\plink.exe"
& $plink -i "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk" `
    -hostkey "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss" `
    -L 5555:localhost:5555 `
    -N `
    root@92.246.129.3
