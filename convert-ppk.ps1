# Converter PPK para OpenSSH usando puttygen
$ppkFile = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$outputFile = "$env:USERPROFILE\.ssh\serverspace_key"

# Baixar puttygen portable se não existir
$puttygenPath = "$env:TEMP\puttygen.exe"
if (-not (Test-Path $puttygenPath)) {
    Write-Host "Baixando puttygen..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/puttygen.exe" -OutFile $puttygenPath
}

# Converter
Write-Host "Convertendo chave PPK para OpenSSH..." -ForegroundColor Yellow
& $puttygenPath $ppkFile -O private-openssh -o $outputFile

# Definir permissões
icacls $outputFile /inheritance:r
icacls $outputFile /grant:r "$($env:USERNAME):(R)"

Write-Host "Chave convertida: $outputFile" -ForegroundColor Green
