# Script de Deploy Chutaí Bot - Server Space (usando PuTTY)
param(
    [string]$ServerIP = "92.246.129.3",
    [string]$User = "root",
    [string]$PPKKey = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk",
    [string]$HostKey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Chutaí Bot - Server Space" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Baixar ferramentas PuTTY se necessário
$plink = "$env:TEMP\plink.exe"
$pscp = "$env:TEMP\pscp.exe"

if (-not (Test-Path $plink)) {
    Write-Host "Baixando plink..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe" -OutFile $plink
}

if (-not (Test-Path $pscp)) {
    Write-Host "Baixando pscp..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" -OutFile $pscp
}

function Invoke-RemoteCommand {
    param([string]$Command)
    & $plink -i $PPKKey -hostkey $HostKey $User@$ServerIP $Command
}

function Copy-ToServer {
    param([string]$Source, [string]$Destination)
    & $pscp -i $PPKKey -hostkey $HostKey -r $Source "${User}@${ServerIP}:${Destination}"
}

# 1. Testar conexão
Write-Host "[1/9] Testando conexão..." -ForegroundColor Yellow
$test = Invoke-RemoteCommand "echo OK"
if ($test -ne "OK") {
    Write-Host "Erro ao conectar!" -ForegroundColor Red
    exit 1
}
Write-Host "Conexao estabelecida!" -ForegroundColor Green

# 2. Atualizar sistema
Write-Host "[2/9] Atualizando sistema..." -ForegroundColor Yellow
Invoke-RemoteCommand "apt-get update -y"
Write-Host "Sistema atualizado!" -ForegroundColor Green

# 3. Instalar Node.js 20
Write-Host "[3/9] Instalando Node.js 20..." -ForegroundColor Yellow
Invoke-RemoteCommand "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
Invoke-RemoteCommand "apt-get install -y nodejs"
Write-Host "Node.js instalado!" -ForegroundColor Green

# 4. Instalar PostgreSQL
Write-Host "[4/9] Instalando PostgreSQL..." -ForegroundColor Yellow
Invoke-RemoteCommand "apt-get install -y postgresql postgresql-contrib"
Invoke-RemoteCommand "systemctl enable postgresql && systemctl start postgresql"
Write-Host "PostgreSQL instalado!" -ForegroundColor Green

# 5. Instalar dependências adicionais
Write-Host "[5/9] Instalando dependências..." -ForegroundColor Yellow
Invoke-RemoteCommand "apt-get install -y git build-essential"
Invoke-RemoteCommand "npm install -g pm2"
Write-Host "Dependencias instaladas!" -ForegroundColor Green

# 6. Configurar PostgreSQL
Write-Host "[6/9] Configurando banco de dados..." -ForegroundColor Yellow
$dbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ })
Invoke-RemoteCommand "sudo -u postgres psql -c \`"CREATE USER chutai WITH PASSWORD '$dbPassword';\`""
Invoke-RemoteCommand "sudo -u postgres psql -c \`"CREATE DATABASE chutai OWNER chutai;\`""
Invoke-RemoteCommand "sudo -u postgres psql -c \`"GRANT ALL PRIVILEGES ON DATABASE chutai TO chutai;\`""
Write-Host "Banco configurado!" -ForegroundColor Green

# 7. Criar diretório do projeto
Write-Host "[7/9] Criando estrutura..." -ForegroundColor Yellow
Invoke-RemoteCommand "mkdir -p /opt/chutai"
Write-Host "Estrutura criada!" -ForegroundColor Green

# 8. Copiar arquivos do projeto
Write-Host "[8/9] Copiando arquivos..." -ForegroundColor Yellow
Push-Location "C:\dev\Chutaí"

Copy-ToServer "package.json" "/opt/chutai/"
Copy-ToServer "tsconfig.json" "/opt/chutai/"
Copy-ToServer "prisma" "/opt/chutai/"
Copy-ToServer "src" "/opt/chutai/"

Pop-Location
Write-Host "Arquivos copiados!" -ForegroundColor Green

# 9. Configurar e iniciar aplicação
Write-Host "[9/9] Configurando aplicacao..." -ForegroundColor Yellow

# Criar arquivo .env
$envContent = "DATABASE_URL=postgresql://chutai:$dbPassword@localhost:5432/chutai`nNODE_ENV=production`nPORT=3000"
Invoke-RemoteCommand "echo '$envContent' > /opt/chutai/.env"

# Instalar dependências e configurar Prisma
Invoke-RemoteCommand "cd /opt/chutai && npm install"
Invoke-RemoteCommand "cd /opt/chutai && npx prisma generate"
Invoke-RemoteCommand "cd /opt/chutai && npx prisma migrate deploy"

# Compilar TypeScript
Invoke-RemoteCommand "cd /opt/chutai && npm run build"

# Iniciar com PM2
Invoke-RemoteCommand "cd /opt/chutai && pm2 start dist/index.js --name chutai-bot"
Invoke-RemoteCommand "pm2 startup systemd -u root --hp /root"
Invoke-RemoteCommand "pm2 save"

Write-Host "Aplicacao iniciada!" -ForegroundColor Green

# Resumo
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy Concluido com Sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Informacoes do servidor:" -ForegroundColor Cyan
Write-Host "  IP: $ServerIP" -ForegroundColor White
Write-Host "  Usuario: $User" -ForegroundColor White
Write-Host "  Diretorio: /opt/chutai" -ForegroundColor White
Write-Host ""
Write-Host "Banco de dados:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Database: chutai" -ForegroundColor White
Write-Host "  User: chutai" -ForegroundColor White
Write-Host "  Password: $dbPassword" -ForegroundColor White
Write-Host ""
Write-Host "Comandos uteis:" -ForegroundColor Cyan
Write-Host "  Ver logs: & '$plink' -i '$PPKKey' -hostkey '$HostKey' $User@$ServerIP 'pm2 logs chutai-bot'" -ForegroundColor White
Write-Host "  Status: & '$plink' -i '$PPKKey' -hostkey '$HostKey' $User@$ServerIP 'pm2 status'" -ForegroundColor White
Write-Host "  Reiniciar: & '$plink' -i '$PPKKey' -hostkey '$HostKey' $User@$ServerIP 'pm2 restart chutai-bot'" -ForegroundColor White
Write-Host ""

# Salvar informações
$info = @"
Servidor Server Space - Chutai Bot
===================================
IP: $ServerIP
Usuario: $User
Diretorio: /opt/chutai
DB Password: $dbPassword
Data Deploy: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")

Comandos Uteis:
- Ver logs: & '$plink' -i '$PPKKey' -hostkey '$HostKey' $User@$ServerIP 'pm2 logs chutai-bot'
- Status: & '$plink' -i '$PPKKey' -hostkey '$HostKey' $User@$ServerIP 'pm2 status'
- Reiniciar: & '$plink' -i '$PPKKey' -hostkey '$HostKey' $User@$ServerIP 'pm2 restart chutai-bot'
- Conectar: & '$plink' -i '$PPKKey' -hostkey '$HostKey' $User@$ServerIP
"@

$info | Out-File -FilePath "serverspace-info.txt" -Encoding UTF8
Write-Host "Informacoes salvas em: serverspace-info.txt" -ForegroundColor Green
Write-Host ""
