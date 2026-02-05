# Script SIMPLIFICADO para criar instância Oracle Cloud - VERSAO FINAL
# Usa CMD para evitar problemas de escape do PowerShell

# Adiciona OCI CLI ao PATH
$env:Path = "$HOME\bin;" + $env:Path

Write-Host "Oracle Cloud - Criador de Instancia Simplificado" -ForegroundColor Cyan
Write-Host "=" -NoNewline; Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""

# Verifica se OCI CLI está disponível
try {
    $null = & oci --version 2>&1
    Write-Host "[OK] OCI CLI encontrado" -ForegroundColor Green
}
catch {
    Write-Host "[ERRO] OCI CLI nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# IDs configurados
$COMPARTMENT_ID = "ocid1.tenancy.oc1..aaaaaaaannz4snam6r5asxx24c2u3i2wdp2kdaxzdnn5by4i6l5vd2vmfrqq"
$SUBNET_ID = "ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaau3ird5qhiovhcpmoopyihmvkyz4mb2urr7aufubh6ksuwhl77i5a"
$IMAGE_ID = "ocid1.image.oc1.sa-saopaulo-1.aaaaaaaa2p4kpj2zvnjlzc64h27xiddnhr5pdmrcph7rtp3d5cqnr65d7mza"
$INSTANCE_NAME = "chutai-bot"
$SHAPE = "VM.Standard.A1.Flex"
$AD = "bUbN:SA-SAOPAULO-1-AD-1"
$SSH_KEY_FILE = "C:\Users\Gustavo\Documents\.ssh\oracle-chutai.pub"

Write-Host "[INFO] Tentando criar instancia..." -ForegroundColor Yellow
Write-Host "[INFO] Shape: $SHAPE (4 OCPU, 24 GB RAM)" -ForegroundColor Cyan
Write-Host "[INFO] Intervalo: 30 segundos entre tentativas" -ForegroundColor Cyan
Write-Host "[INFO] Pressione Ctrl+C para cancelar" -ForegroundColor Yellow
Write-Host ""

$attempt = 0
$maxAttempts = 1000

while ($attempt -lt $maxAttempts) {
    $attempt++
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$timestamp] Tentativa #$attempt" -ForegroundColor White -NoNewline
    Write-Host " - Enviando requisicao..." -ForegroundColor Gray
    
    try {
        # Usa CMD para executar - evita problemas de escape do PowerShell
        $cmd = "oci compute instance launch --compartment-id $COMPARTMENT_ID --availability-domain $AD --shape $SHAPE --shape-config `"{`\`"ocpus`\`":4,`\`"memoryInGBs`\`":24}`" --display-name $INSTANCE_NAME --image-id $IMAGE_ID --subnet-id $SUBNET_ID --assign-public-ip true --ssh-authorized-keys-file `"$SSH_KEY_FILE`""
        
        $output = cmd /c $cmd 2>&1 | Out-String
        
        if ($output -match '"id"' -and $output -notmatch 'ServiceError') {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  SUCESSO! Instancia criada!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host $output
            
            # Beep
            [Console]::Beep(1000, 500)
            [Console]::Beep(1200, 500)
            [Console]::Beep(1500, 500)
            
            Write-Host ""
            Write-Host "Verifique o IP no Oracle Cloud Console!" -ForegroundColor Yellow
            Write-Host "Menu -> Compute -> Instances" -ForegroundColor Cyan
            
            exit 0
        }
        
        # Verifica erros
        if ($output -match "Out of capacity|OutOfCapacity|out of host capacity") {
            Write-Host "  -> Sem capacidade disponivel" -ForegroundColor Red
        }
        elseif ($output -match "LimitExceeded") {
            Write-Host ""
            Write-Host "ERRO: Limite de recursos atingido!" -ForegroundColor Red
            exit 1
        }
        elseif ($output -match "CannotParseRequest|must be in JSON format") {
            Write-Host "  -> Erro de formato (tentando novamente)" -ForegroundColor Yellow
        }
        elseif ($output -match "NotAuthenticated|authorization") {
            Write-Host ""
            Write-Host "ERRO: Falha de autenticacao!" -ForegroundColor Red
            exit 1
        }
        else {
            $shortError = if ($output.Length -gt 150) { $output.Substring(0, 150) } else { $output }
            Write-Host "  -> Erro: $shortError..." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  -> Erro na execucao: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "  -> Aguardando 30 segundos..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

Write-Host ""
Write-Host "Maximo de tentativas atingido. Tente de madrugada (2h-6h)" -ForegroundColor Yellow
