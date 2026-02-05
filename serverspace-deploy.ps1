# Script de Deploy Automático para Server Space
# Chutaí WhatsApp Bot

param(
    [string]$ServerIP = "92.246.129.3",
    [string]$User = "root",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\id_rsa"
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Deploy Chutaí Bot - Server Space" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Função para executar comandos SSH
function Invoke-SSHCommand {
    param([string]$Command)
    ssh -i $SSHKey -o StrictHostKeyChecking=no $User@$ServerIP $Command
}

# Função para copiar arquivos
function Copy-ToServer {
    param([string]$Source, [string]$Destination)
    scp -i $SSHKey -o StrictHostKeyChecking=no -r $Source "${User}@${ServerIP}:${Destination}"
}

# 1. Testar conexão
Write-Host "[1/8] Testando conexão com servidor..." -ForegroundColor Yellow
$testConnection = ssh -i $SSHKey -o StrictHostKeyChecking=no -o ConnectTimeout=5 $User@$ServerIP "echo 'OK'" 2>&1
if ($testConnection -notlike "*OK*") {
    Write-Host "❌ Erro ao conectar. Verifique se:" -ForegroundColor Red
    Write-Host "  - O IP está correto: $ServerIP" -ForegroundColor Red
    Write-Host "  - A chave SSH está em: $SSHKey" -ForegroundColor Red
    Write-Host ""
    Write-Host "Baixe a chave do painel Server Space e salve em: $env:USERPROFILE\.ssh\serverspace_key" -ForegroundColor Yellow
    Write-Host "Depois execute: .\serverspace-deploy.ps1 -SSHKey `"$env:USERPROFILE\.ssh\serverspace_key`"" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Conexão estabelecida!" -ForegroundColor Green

# 2. Atualizar sistema
Write-Host "[2/8] Atualizando sistema..." -ForegroundColor Yellow
Invoke-SSHCommand "apt-get update && apt-get upgrade -y"
Write-Host "✓ Sistema atualizado!" -ForegroundColor Green

# 3. Instalar dependências
Write-Host "[3/8] Instalando Node.js, PostgreSQL e dependências..." -ForegroundColor Yellow
Invoke-SSHCommand @"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
apt-get install -y nodejs postgresql postgresql-contrib git build-essential && \
npm install -g pm2 && \
systemctl enable postgresql && \
systemctl start postgresql
"@
Write-Host "✓ Dependências instaladas!" -ForegroundColor Green

# 4. Configurar PostgreSQL
Write-Host "[4/8] Configurando PostgreSQL..." -ForegroundColor Yellow
$dbPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
Invoke-SSHCommand @"
sudo -u postgres psql -c \"CREATE USER chutai WITH PASSWORD '$dbPassword';\" && \
sudo -u postgres psql -c \"CREATE DATABASE chutai OWNER chutai;\" && \
sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE chutai TO chutai;\"
"@
Write-Host "✓ PostgreSQL configurado!" -ForegroundColor Green
Write-Host "  Usuário: chutai" -ForegroundColor Cyan
Write-Host "  Senha: $dbPassword" -ForegroundColor Cyan

# 5. Criar estrutura de diretórios
Write-Host "[5/8] Criando estrutura de diretórios..." -ForegroundColor Yellow
Invoke-SSHCommand "mkdir -p /opt/chutai && cd /opt/chutai"
Write-Host "✓ Diretórios criados!" -ForegroundColor Green

# 6. Copiar arquivos do projeto
Write-Host "[6/8] Copiando arquivos do projeto..." -ForegroundColor Yellow
Push-Location "c:\dev\Chutaí"

# Criar arquivo .gitignore temporário para excluir arquivos desnecessários
$excludeList = @"
node_modules/
.git/
auth_info_baileys/
*.log
.env.local
"@
$excludeList | Out-File -FilePath ".deployignore" -Encoding UTF8

# Copiar arquivos essenciais
Copy-ToServer "package.json" "/opt/chutai/"
Copy-ToServer "tsconfig.json" "/opt/chutai/"
Copy-ToServer "prisma" "/opt/chutai/"
Copy-ToServer "src" "/opt/chutai/"

Pop-Location
Write-Host "✓ Arquivos copiados!" -ForegroundColor Green

# 7. Configurar ambiente e instalar dependências
Write-Host "[7/8] Configurando ambiente..." -ForegroundColor Yellow
$envContent = @"
DATABASE_URL=postgresql://chutai:$dbPassword@localhost:5432/chutai
NODE_ENV=production
PORT=3000
"@
Invoke-SSHCommand "echo '$envContent' > /opt/chutai/.env"
Invoke-SSHCommand "cd /opt/chutai && npm install && npx prisma generate && npx prisma migrate deploy"
Write-Host "✓ Ambiente configurado!" -ForegroundColor Green

# 8. Configurar PM2 e iniciar aplicação
Write-Host "[8/8] Configurando PM2 e iniciando aplicação..." -ForegroundColor Yellow
Invoke-SSHCommand @"
cd /opt/chutai && \
pm2 start npm --name chutai-bot -- start && \
pm2 startup systemd -u root --hp /root && \
pm2 save
"@
Write-Host "✓ Aplicação iniciada!" -ForegroundColor Green

# Resumo final
Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  Deploy Concluído com Sucesso! " -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Informações do servidor:" -ForegroundColor Cyan
Write-Host "  IP: $ServerIP" -ForegroundColor White
Write-Host "  Usuário: $User" -ForegroundColor White
Write-Host "  Diretório: /opt/chutai" -ForegroundColor White
Write-Host ""
Write-Host "Banco de dados:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Database: chutai" -ForegroundColor White
Write-Host "  User: chutai" -ForegroundColor White
Write-Host "  Password: $dbPassword" -ForegroundColor White
Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Cyan
Write-Host "  Conectar ao servidor: ssh -i $SSHKey $User@$ServerIP" -ForegroundColor White
Write-Host "  Ver logs: ssh -i $SSHKey $User@$ServerIP 'pm2 logs chutai-bot'" -ForegroundColor White
Write-Host "  Status: ssh -i $SSHKey $User@$ServerIP 'pm2 status'" -ForegroundColor White
Write-Host "  Reiniciar: ssh -i $SSHKey $User@$ServerIP 'pm2 restart chutai-bot'" -ForegroundColor White
Write-Host ""

# Salvar informações em arquivo
$info = @"
Servidor: $ServerIP
Usuário: $User
DB Password: $dbPassword
Data Deploy: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
$info | Out-File -FilePath "serverspace-info.txt" -Encoding UTF8
Write-Host "✓ Informações salvas em: serverspace-info.txt" -ForegroundColor Green
