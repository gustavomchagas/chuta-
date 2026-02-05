# Script para gerenciar o bot no Server Space
param(
    [Parameter(Position = 0)]
    [ValidateSet("logs", "status", "restart", "stop", "start", "connect")]
    [string]$Action = "status"
)

$plink = "$env:TEMP\plink.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$server = "root@92.246.129.3"

switch ($Action) {
    "logs" {
        Write-Host "Visualizando logs do bot..." -ForegroundColor Cyan
        Write-Host "Pressione Ctrl+C para sair" -ForegroundColor Yellow
        & $plink -i $ppk -hostkey $hostkey $server "pm2 logs chutai-bot"
    }
    "status" {
        Write-Host "Status do servidor:" -ForegroundColor Cyan
        & $plink -i $ppk -hostkey $hostkey $server "pm2 status && echo '' && free -h"
    }
    "restart" {
        Write-Host "Reiniciando bot..." -ForegroundColor Yellow
        & $plink -i $ppk -hostkey $hostkey $server "pm2 restart chutai-bot"
        Write-Host "Bot reiniciado!" -ForegroundColor Green
    }
    "stop" {
        Write-Host "Parando bot..." -ForegroundColor Yellow
        & $plink -i $ppk -hostkey $hostkey $server "pm2 stop chutai-bot"
        Write-Host "Bot parado!" -ForegroundColor Red
    }
    "start" {
        Write-Host "Iniciando bot..." -ForegroundColor Yellow
        & $plink -i $ppk -hostkey $hostkey $server "pm2 start chutai-bot"
        Write-Host "Bot iniciado!" -ForegroundColor Green
    }
    "connect" {
        Write-Host "Conectando ao servidor..." -ForegroundColor Cyan
        & $plink -i $ppk -hostkey $hostkey $server
    }
}
