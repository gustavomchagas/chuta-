@echo off
REM Script para criar instancia Oracle Cloud - Versao BAT
REM Batch files lidam melhor com JSON/aspas

setlocal EnableDelayedExpansion

REM Adiciona OCI ao PATH
set PATH=%USERPROFILE%\bin;%PATH%

echo ================================================
echo   Oracle Cloud - Auto Instance Creator
echo ================================================
echo.

REM Variaveis
set COMPARTMENT_ID=ocid1.tenancy.oc1..aaaaaaaannz4snam6r5asxx24c2u3i2wdp2kdaxzdnn5by4i6l5vd2vmfrqq
set SUBNET_ID=ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaau3ird5qhiovhcpmoopyihmvkyz4mb2urr7aufubh6ksuwhl77i5a
set IMAGE_ID=ocid1.image.oc1.sa-saopaulo-1.aaaaaaaa2p4kpj2zvnjlzc64h27xiddnhr5pdmrcph7rtp3d5cqnr65d7mza
set INSTANCE_NAME=chutai-bot
set SHAPE=VM.Standard.A1.Flex
set AD=bUbN:SA-SAOPAULO-1-AD-1
set SSH_KEY=C:\Users\Gustavo\Documents\.ssh\oracle-chutai.pub

echo [INFO] Tentando criar instancia...
echo [INFO] Shape: %SHAPE% (4 OCPU, 24 GB RAM)
echo [INFO] Intervalo: 30 segundos entre tentativas
echo [INFO] Pressione Ctrl+C para cancelar
echo.

set attempt=0
set maxAttempts=1000

:loop
set /a attempt+=1
echo [%TIME%] Tentativa #%attempt% - Enviando requisicao...

REM Comando OCI - aspas funcionam corretamente em BAT
oci compute instance launch ^
    --compartment-id %COMPARTMENT_ID% ^
    --availability-domain %AD% ^
    --shape %SHAPE% ^
    --shape-config "{\"ocpus\":4,\"memoryInGBs\":24}" ^
    --display-name %INSTANCE_NAME% ^
    --image-id %IMAGE_ID% ^
    --subnet-id %SUBNET_ID% ^
    --assign-public-ip true ^
    --ssh-authorized-keys-file "%SSH_KEY%" ^
    > %TEMP%\oci_output.txt 2>&1

REM Verifica resultado
findstr /C:"\"id\"" %TEMP%\oci_output.txt >nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCESSO! Instancia criada!
    echo ========================================
    echo.
    type %TEMP%\oci_output.txt
    echo.
    echo Verifique o IP no Oracle Cloud Console!
    echo Menu -^> Compute -^> Instances
    pause
    exit /b 0
)

REM Verifica erros
findstr /C:"Out of capacity" /C:"OutOfCapacity" /C:"out of host capacity" %TEMP%\oci_output.txt >nul
if %errorlevel% equ 0 (
    echo   -^> Sem capacidade disponivel
    goto wait
)

findstr /C:"LimitExceeded" %TEMP%\oci_output.txt >nul
if %errorlevel% equ 0 (
    echo.
    echo ERRO: Limite de recursos atingido!
    echo Verifique se ja tem instancias Always Free rodando.
    pause
    exit /b 1
)

findstr /C:"NotAuthenticated" /C:"authorization" %TEMP%\oci_output.txt >nul
if %errorlevel% equ 0 (
    echo.
    echo ERRO: Falha de autenticacao!
    pause
    exit /b 1
)

echo   -^> Erro (ver detalhes abaixo)
type %TEMP%\oci_output.txt | findstr /C:"code" /C:"message"

:wait
echo   -^> Aguardando 30 segundos...
timeout /t 30 /nobreak >nul

if %attempt% lss %maxAttempts% goto loop

echo.
echo Maximo de tentativas atingido. Tente de madrugada (2h-6h)
pause
