# Script para criar túnel SSH e acessar painel administrativo
param(
    [int]$Port = 3334
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Acesso ao Painel Admin" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$plink = "$env:TEMP\plink.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$server = "root@92.246.129.3"

# Verificar se o admin está rodando
Write-Host "Verificando se o painel esta rodando..." -ForegroundColor Yellow
$status = & $plink -i $ppk -hostkey $hostkey $server "pm2 list | grep chutai-admin"

if (-not $status -or $status -notlike "*online*") {
    Write-Host "Painel nao esta rodando. Iniciando..." -ForegroundColor Yellow
    & $plink -i $ppk -hostkey $hostkey $server "cd /opt/chutai && pm2 start src/admin.ts --name chutai-admin --interpreter npx --interpreter-args tsx && pm2 save"
    Start-Sleep -Seconds 3
    Write-Host "Painel iniciado!" -ForegroundColor Green
}
else {
    Write-Host "Painel ja esta rodando!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Criando tunel SSH..." -ForegroundColor Yellow
Write-Host "Porta local: $Port" -ForegroundColor Cyan
Write-Host "Servidor: 92.246.129.3:$Port" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acesse: http://localhost:$Port" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host ""
Write-Host "Pressione Ctrl+C para encerrar o tunel" -ForegroundColor Yellow
Write-Host ""

# Tentar abrir o navegador
Start-Sleep -Seconds 2
Start-Process "http://localhost:$Port"

# Criar túnel (fica em execução)
& $plink -i $ppk -hostkey $hostkey -L "${Port}:localhost:${Port}" $server
