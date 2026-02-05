# Script Simples para Conectar WhatsApp
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Conectar WhatsApp - Metodo Simples" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$plink = "$env:TEMP\plink.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"

Write-Host "Opcao 1: Ver QR Code no terminal (pode nao aparecer direito)" -ForegroundColor Yellow
Write-Host "Opcao 2: Gerar link para escanear no celular" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host ""
$choice = Read-Host "Escolha (1 ou 2)"

if ($choice -eq "2") {
    Write-Host ""
    Write-Host "Aguarde, gerando link..." -ForegroundColor Yellow
    
    # Pegar string do QR code dos logs
    $qrString = & $plink -i $ppk -hostkey $hostkey root@92.246.129.3 @"
cd /opt/chutai
# Pegar QR dos logs recentes
pm2 logs chutai-bot --nostream --lines 200 2>&1 | grep -A 1 'connection.update' | grep 'qr' | tail -1 | sed 's/.*"qr":"\([^"]*\)".*/\1/'
"@
    
    if ($qrString) {
        # Criar URL para qr-code generator
        $encoded = [System.Web.HttpUtility]::UrlEncode($qrString)
        $url = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=$encoded"
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  QR Code Pronto!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Abra este link no seu computador ou celular:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host $url -ForegroundColor White -BackgroundColor DarkBlue
        Write-Host ""
        Write-Host "Ou escaneie diretamente este QR Code:" -ForegroundColor Cyan
        Write-Host $qrString -ForegroundColor Yellow
        Write-Host ""
        
        # Tentar abrir automaticamente
        Start-Process $url
        
        Write-Host "Link aberto no navegador!" -ForegroundColor Green
    }
    else {
        Write-Host "Nao foi possivel pegar o QR Code. Tentando opcao 1..." -ForegroundColor Red
        $choice = "1"
    }
}

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Abrindo logs... (Pressione Ctrl+C para sair)" -ForegroundColor Yellow
    Write-Host "Procure pelo QR Code (quadrado com caracteres)" -ForegroundColor Yellow
    Write-Host ""
    Start-Sleep -Seconds 2
    
    & $plink -i $ppk -hostkey $hostkey root@92.246.129.3 "pm2 logs chutai-bot"
}
