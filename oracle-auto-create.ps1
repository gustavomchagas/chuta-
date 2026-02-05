# Script para criar instância Oracle Cloud automaticamente
# Tenta criar até conseguir (resolve problema de capacidade)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Oracle Cloud - Auto Instance Creator" -ForegroundColor Cyan
Write-Host "  Script para criar instância A1.Flex automaticamente" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configurações - PREENCHA COM SEUS DADOS
$COMPARTMENT_ID = "ocid1.tenancy.oc1..aaaaaaaannz4snam6r5asxx24c2u3i2wdp2kdaxzdnn5by4i6l5vd2vmfrqq"
$SUBNET_ID = "ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaau3ird5qhiovhcpmoopyihmvkyz4mb2urr7aufubh6ksuwhl77i5a"
$IMAGE_ID = "ocid1.image.oc1.sa-saopaulo-1.aaaaaaaalcbhp3iotoxx4koq4qq7tpl46n3alcv2iiyai4y7bgbr2xarnk6q"
$SSH_PUBLIC_KEY_PATH = "C:\Users\Gustavo\Documents\.ssh\oci_api_key_public.pem"  # Chave pública SSH

# Configurações da instância
$INSTANCE_NAME = "chutai-bot"
$SHAPE = "VM.Standard.A1.Flex"
$OCPU_COUNT = 4
$MEMORY_GB = 24
$REGION = "sa-saopaulo-1"
$AVAILABILITY_DOMAINS = @("bUbN:SA-SAOPAULO-1-AD-1")  # Adicione outros ADs se necessário
$CONFIG_FILE = "C:\dev\Chutaí\sa-saopaulo-1"
$SSH_KEY_PATH = "C:\Users\Gustavo\Documents\.ssh\oci_api_key_public.pem"

# Contador
$attempt = 0
$maxAttempts = 1000
$delaySeconds = 30

Write-Host "[INFO] Verificando OCI CLI..." -ForegroundColor Yellow

# Adiciona OCI CLI ao PATH
$env:Path = "$HOME\bin;" + $env:Path

# Verifica se OCI CLI está instalado
if (-not (Get-Command "oci" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERRO] OCI CLI não está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale com:" -ForegroundColor Yellow
    Write-Host "  1. Baixe: https://github.com/oracle/oci-cli/releases" -ForegroundColor Cyan
    Write-Host "  2. Execute o instalador para Windows" -ForegroundColor Cyan
    Write-Host "  3. Configure com: oci setup config" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "[OK] OCI CLI encontrado" -ForegroundColor Green
Write-Host ""

# Verifica configuração
Write-Host "[INFO] Verificando configuração OCI..." -ForegroundColor Yellow
$env:OCI_CLI_CONFIG_FILE = $CONFIG_FILE
$configTest = & oci iam region list --config-file $CONFIG_FILE 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] OCI CLI não está configurado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configure com: oci setup config" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[OK] OCI CLI configurado" -ForegroundColor Green
Write-Host ""

# Verifica se a chave SSH existe
if (-not (Test-Path $SSH_KEY_PATH)) {
    Write-Host "[ERRO] Chave SSH pública não encontrada: $SSH_KEY_PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Coloque sua chave pública SSH no caminho especificado" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$sshPublicKey = Get-Content $SSH_KEY_PATH -Raw

Write-Host "[INFO] Iniciando tentativas de criação..." -ForegroundColor Yellow
Write-Host "[INFO] Shape: $SHAPE ($OCPU_COUNT OCPU, $MEMORY_GB GB RAM)" -ForegroundColor Cyan
Write-Host "[INFO] Intervalo entre tentativas: $delaySeconds segundos" -ForegroundColor Cyan
Write-Host "[INFO] Pressione Ctrl+C para cancelar" -ForegroundColor Yellow
Write-Host ""

# Loop de tentativas
while ($attempt -lt $maxAttempts) {
    $attempt++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "[$timestamp] Tentativa #$attempt" -ForegroundColor White
    
    foreach ($ad in $AVAILABILITY_DOMAINS) {
        Write-Host "  Tentando AD: $ad..." -ForegroundColor Gray
        
        # Monta o comando OCI CLI
        $env:OCI_CLI_CONFIG_FILE = $CONFIG_FILE
        $result = & oci compute instance launch `
            --config-file $CONFIG_FILE `
            --compartment-id $COMPARTMENT_ID `
            --availability-domain $ad `
            --shape $SHAPE `
            --shape-config "{`"ocpus`":$OCPU_COUNT,`"memoryInGBs`":$MEMORY_GB}" `
            --display-name $INSTANCE_NAME `
            --image-id $IMAGE_ID `
            --subnet-id $SUBNET_ID `
            --assign-public-ip true `
            --ssh-authorized-keys-file $SSH_KEY_PATH `
            --wait-for-state RUNNING `
            2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "==================================================" -ForegroundColor Green
            Write-Host "  ✅ INSTÂNCIA CRIADA COM SUCESSO!" -ForegroundColor Green
            Write-Host "==================================================" -ForegroundColor Green
            Write-Host ""
            
            # Parse do resultado para extrair informações
            $instanceInfo = $result | ConvertFrom-Json
            $publicIp = $instanceInfo.data.'public-ip'
            
            Write-Host "[INFO] Nome: $INSTANCE_NAME" -ForegroundColor Cyan
            Write-Host "[INFO] IP Público: $publicIp" -ForegroundColor Cyan
            Write-Host "[INFO] Availability Domain: $ad" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "[NEXT] Conecte via SSH:" -ForegroundColor Yellow
            Write-Host "  ssh -i C:\Users\Gustavo\Documents\.ssh\oci_api_key.pem ubuntu@$publicIp" -ForegroundColor White
            Write-Host ""
            
            # Toca um beep para notificar
            [Console]::Beep(1000, 500)
            [Console]::Beep(1200, 500)
            [Console]::Beep(1500, 500)
            
            exit 0
        }
        
        # Verifica o tipo de erro
        $errorMessage = $result | Out-String
        
        if ($errorMessage -match "Out of capacity|InternalError|500") {
            Write-Host "  ❌ Sem capacidade neste AD" -ForegroundColor Red
        }
        elseif ($errorMessage -match "LimitExceeded") {
            Write-Host "  ⚠️  Limite de recursos atingido" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Você pode ter atingido o limite de instâncias Always Free." -ForegroundColor Yellow
            Write-Host "Verifique se há outras instâncias rodando e delete-as." -ForegroundColor Yellow
            Write-Host ""
            exit 1
        }
        else {
            Write-Host "  ❌ Erro desconhecido" -ForegroundColor Red
            Write-Host $errorMessage -ForegroundColor Gray
        }
    }
    
    Write-Host "  Aguardando $delaySeconds segundos para próxima tentativa..." -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds $delaySeconds
}

Write-Host ""
Write-Host "[ERRO] Máximo de tentativas atingido ($maxAttempts)" -ForegroundColor Red
Write-Host "Tente novamente mais tarde ou em outro horário" -ForegroundColor Yellow
Write-Host ""
