@echo off
REM Script para criar instancia Oracle Cloud - Usando arquivo JSON
setlocal EnableDelayedExpansion

REM Adiciona OCI ao PATH
set PATH=%USERPROFILE%\bin;%PATH%

echo ================================================
echo   Oracle Cloud - Auto Instance Creator
echo ================================================
echo.

REM Le a chave SSH publica
set SSH_KEY_FILE=C:\Users\Gustavo\Documents\.ssh\oracle-chutai.pub
set /p SSH_KEY=<%SSH_KEY_FILE%

REM Cria arquivo JSON com a chave SSH
set JSON_FILE=%TEMP%\oci-instance-config.json

(
echo {
echo     "compartmentId": "ocid1.tenancy.oc1..aaaaaaaannz4snam6r5asxx24c2u3i2wdp2kdaxzdnn5by4i6l5vd2vmfrqq",
echo     "availabilityDomain": "bUbN:SA-SAOPAULO-1-AD-1",
echo     "shape": "VM.Standard.A1.Flex",
echo     "shapeConfig": {
echo         "ocpus": 4,
echo         "memoryInGBs": 24
echo     },
echo     "displayName": "chutai-bot",
echo     "imageId": "ocid1.image.oc1.sa-saopaulo-1.aaaaaaaa2p4kpj2zvnjlzc64h27xiddnhr5pdmrcph7rtp3d5cqnr65d7mza",
echo     "createVnicDetails": {
echo         "subnetId": "ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaau3ird5qhiovhcpmoopyihmvkyz4mb2urr7aufubh6ksuwhl77i5a",
echo         "assignPublicIp": true
echo     },
echo     "metadata": {
echo         "ssh_authorized_keys": "!SSH_KEY!"
echo     }
echo }
) > %JSON_FILE%

echo [INFO] Tentando criar instancia...
echo [INFO] Shape: VM.Standard.A1.Flex (4 OCPU, 24 GB RAM)
echo [INFO] Intervalo: 30 segundos entre tentativas
echo [INFO] Pressione Ctrl+C para cancelar
echo.

set attempt=0

:loop
set /a attempt+=1
echo [%TIME%] Tentativa #%attempt% - Enviando requisicao...

REM Usa --from-json para passar configuracao completa
oci compute instance launch --from-json file://%JSON_FILE% > %TEMP%\oci_output.txt 2>&1

REM Verifica resultado
findstr /C:"lifecycle-state" %TEMP%\oci_output.txt >nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCESSO! Instancia criada!
    echo ========================================
    echo.
    type %TEMP%\oci_output.txt
    echo.
    echo Verifique o IP no Oracle Cloud Console!
    pause
    exit /b 0
)

REM Verifica erros especificos
findstr /C:"Out of capacity" /C:"OutOfCapacity" /C:"out of host capacity" /C:"InternalError" %TEMP%\oci_output.txt >nul
if %errorlevel% equ 0 (
    echo   -^> Sem capacidade disponivel
    goto wait
)

findstr /C:"LimitExceeded" %TEMP%\oci_output.txt >nul
if %errorlevel% equ 0 (
    echo ERRO: Limite de recursos atingido!
    pause
    exit /b 1
)

echo   -^> Erro:
type %TEMP%\oci_output.txt | findstr /C:"code" /C:"message"

:wait
echo   -^> Aguardando 30 segundos...
timeout /t 30 /nobreak >nul

if %attempt% lss 1000 goto loop

echo Maximo de tentativas atingido.
pause
