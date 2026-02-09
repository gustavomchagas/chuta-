# Script completo para abrir Prisma Studio do banco de producao
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Prisma Studio - Banco de Producao" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$plink = "$env:TEMP\plink.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$server = "root@92.246.129.3"

# Copiar .env.production para .env temporariamente
Write-Host "1. Configurando ambiente de producao..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    Copy-Item ".env.production" ".env.temp" -Force
    Copy-Item ".env" ".env.backup" -Force
    Copy-Item ".env.production" ".env" -Force
    Write-Host "   OK Configuracao de producao ativada" -ForegroundColor Green
}
else {
    Write-Host "   ERRO: Arquivo .env.production nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Crie o arquivo .env.production com:" -ForegroundColor Yellow
    Write-Host '   DATABASE_URL="postgresql://chutai:ztQSaULHiNA02umGsk58@localhost:5432/chutai"' -ForegroundColor Cyan
    exit 1
}

Write-Host "2. Criando tunel SSH para o banco de dados..." -ForegroundColor Yellow

# Iniciar tunel em background
$tunnelJob = Start-Job -ScriptBlock {
    param($plinkPath, $ppkPath, $hostkeyValue, $serverValue)
    & $plinkPath -i $ppkPath -hostkey $hostkeyValue -L 5432:localhost:5432 -N $serverValue
} -ArgumentList $plink, $ppk, $hostkey, $server

Write-Host "   Tunel criado! (Job ID: $($tunnelJob.Id))" -ForegroundColor Green

# Aguardar conexao
Write-Host "3. Aguardando conexao SSH..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "   Conectado!" -ForegroundColor Green

# Iniciar Prisma Studio
Write-Host "4. Iniciando Prisma Studio..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Prisma Studio sera aberto em:" -ForegroundColor Green
Write-Host "  http://localhost:5555" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para encerrar" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 2

# Abrir Prisma Studio (bloqueia ate fechar)
npm run db:studio

# Cleanup - Parar tunel e restaurar .env ao finalizar
Write-Host ""
Write-Host "Encerrando tunel SSH..." -ForegroundColor Yellow
Stop-Job -Job $tunnelJob
Remove-Job -Job $tunnelJob
Write-Host "Tunel encerrado!" -ForegroundColor Green

# Restaurar .env original
if (Test-Path ".env.backup") {
    Copy-Item ".env.backup" ".env" -Force
    Remove-Item ".env.backup" -Force
    Write-Host "Configuracao original restaurada!" -ForegroundColor Green
}
