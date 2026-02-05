# Script para conectar WhatsApp ao bot
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Conectar WhatsApp ao Bot" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$plink = "$env:TEMP\plink.exe"
$pscp = "$env:TEMP\pscp.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
$server = "root@92.246.129.3"

# Baixar pscp se necessário
if (-not (Test-Path $pscp)) {
    Write-Host "Baixando pscp..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" -OutFile $pscp
}

Write-Host "Gerando QR Code como imagem no servidor..." -ForegroundColor Yellow
Write-Host ""

# Script para instalar qrcode e gerar PNG
$setupScript = @'
cd /opt/chutai
# Instalar qrcode se necessário
if ! command -v qrencode &> /dev/null; then
    apt-get update && apt-get install -y qrencode
fi
# Instalar node-qrcode para gerar PNG programaticamente
npm list qrcode || npm install qrcode
echo "OK"
'@

$result = & $plink -i $ppk -hostkey $hostkey $server $setupScript
Write-Host "Dependencias instaladas!" -ForegroundColor Green

# Script para criar um pequeno servidor HTTP com o QR Code
Write-Host "Criando servidor de QR Code temporario..." -ForegroundColor Yellow

$qrServerScript = @'
cd /opt/chutai
# Criar script Node.js para servir o QR Code
cat > /tmp/qr-server.js << 'EOFJS'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
let qrData = null;

// Capturar QR code dos logs
const { spawn } = require('child_process');
const logs = spawn('pm2', ['logs', 'chutai-bot', '--nostream', '--lines', '500']);

let output = '';
logs.stdout.on('data', (data) => {
  output += data.toString();
});

logs.on('close', () => {
  // Procurar pelo padrão do QR code no output
  const match = output.match(/█[█░\s]+█/g);
  if (match && match.length > 0) {
    qrData = match.join('\n');
  }
  
  // Criar HTML com o QR
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>WhatsApp QR Code - Chutaí Bot</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #128C7E;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .container {
          background: white;
          color: #333;
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 600px;
        }
        h1 { color: #128C7E; margin-bottom: 10px; }
        .qr-code {
          background: white;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          font-family: monospace;
          font-size: 4px;
          line-height: 4px;
          letter-spacing: 0;
          white-space: pre;
          overflow-x: auto;
          border: 3px solid #128C7E;
        }
        .instructions {
          text-align: left;
          margin-top: 20px;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 10px;
        }
        .instructions ol { margin: 10px 0; padding-left: 20px; }
        .instructions li { margin: 8px 0; }
        .refresh { 
          margin-top: 20px; 
          padding: 12px 30px;
          background: #128C7E;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        .refresh:hover { background: #0d6d5f; }
      </style>
      <meta http-equiv="refresh" content="30">
    </head>
    <body>
      <div class="container">
        <h1>🤖 Chutaí Bot - Conectar WhatsApp</h1>
        <p>Escaneie o QR Code abaixo com seu celular</p>
        
        ${qrData ? `<div class="qr-code">${qrData}</div>` : '<p>⏳ Aguardando QR Code... (Atualizando automaticamente)</p>'}
        
        <div class="instructions">
          <h3>📱 Como escanear:</h3>
          <ol>
            <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
            <li>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></li>
            <li>Toque em <strong>Aparelhos conectados</strong></li>
            <li>Toque em <strong>Conectar um aparelho</strong></li>
            <li>Escaneie o QR Code acima</li>
          </ol>
          <p><small>⚠️ Esta página atualiza automaticamente a cada 30 segundos</small></p>
        </div>
        
        <button class="refresh" onclick="location.reload()">🔄 Atualizar Agora</button>
      </div>
    </body>
    </html>
  `;
  
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log('QR_SERVER_READY');
  });
});
EOFJS

# Iniciar servidor
node /tmp/qr-server.js &
SERVER_PID=$!
echo $SERVER_PID > /tmp/qr-server.pid
# Aguardar servidor iniciar
sleep 3
echo "Servidor rodando na porta 8888"
'@

& $plink -i $ppk -hostkey $hostkey $server $qrServerScript | Out-Null

Write-Host "Servidor iniciado!" -ForegroundColor Green
Write-Host ""
Write-Host "Criando tunel SSH para acessar o QR Code..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Abrindo navegador..." -ForegroundColor Cyan

# Abrir navegador
Start-Sleep -Seconds 2
Start-Process "http://localhost:8888"

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  QR Code aberto no navegador!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL: http://localhost:8888" -ForegroundColor Cyan
Write-Host ""
Write-Host "A pagina atualiza automaticamente." -ForegroundColor Yellow
Write-Host "Pressione Ctrl+C para encerrar quando terminar." -ForegroundColor Yellow
Write-Host ""

# Criar túnel e manter aberto
try {
    & $plink -i $ppk -hostkey $hostkey -L "8888:localhost:8888" $server
}
finally {
    # Limpar servidor quando encerrar
    Write-Host ""
    Write-Host "Encerrando servidor de QR Code..." -ForegroundColor Yellow
    & $plink -i $ppk -hostkey $hostkey $server "kill `$(cat /tmp/qr-server.pid 2>/dev/null) 2>/dev/null; rm /tmp/qr-server.pid /tmp/qr-server.js 2>/dev/null"
    Write-Host "Encerrado!" -ForegroundColor Green
}
