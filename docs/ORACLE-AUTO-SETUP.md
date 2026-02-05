# 🤖 Oracle Cloud - Script Automático de Criação de Instância

Este guia explica como usar o script que cria automaticamente a instância no Oracle Cloud, resolvendo o problema de "Out of capacity".

---

## 📋 Pré-requisitos

1. Conta no Oracle Cloud criada
2. VCN e subnet pública criadas (você já fez isso!)
3. Chave SSH baixada e salva
4. PowerShell (já vem no Windows)

---

## 🔧 Passo 1: Instalar Oracle Cloud CLI (OCI CLI)

### Windows:

1. **Baixe o instalador:**
   - Acesse: https://github.com/oracle/oci-cli/releases
   - Baixe: `oci-cli-X.X.X.msi` (versão mais recente para Windows)

2. **Execute o instalador:**
   - Clique 2x no arquivo `.msi`
   - Next → Next → Install
   - Aguarde a instalação

3. **Verifique a instalação:**

   ```powershell
   oci --version
   ```

   Se aparecer a versão, está instalado!

---

## 🔑 Passo 2: Configurar OCI CLI

Execute no PowerShell:

```powershell
oci setup config
```

### Perguntas que vão aparecer:

1. **Location for config file?**

   ```
   Pressione ENTER (usa padrão: C:\Users\SeuUsuario\.oci\config)
   ```

2. **User OCID?**
   - Vá no Oracle Cloud → Clique no ícone do usuário (canto superior direito) → **User Settings**
   - Copie o **OCID** (começa com `ocid1.user.oc1..`)
   - Cole no terminal e pressione ENTER

3. **Tenancy OCID?**
   - Vá no Oracle Cloud → Menu ☰ → **Governance & Administration** → **Tenancy Details**
   - Copie o **OCID** (começa com `ocid1.tenancy.oc1..`)
   - Cole no terminal e pressione ENTER

4. **Region?**

   ```
   sa-saopaulo-1
   ```

5. **Generate a new API Signing RSA key pair?**

   ```
   Y (tecle Y e ENTER)
   ```

6. **Directory for keys?**

   ```
   Pressione ENTER (usa padrão: C:\Users\SeuUsuario\.oci)
   ```

7. **Name for key?**

   ```
   Pressione ENTER (usa padrão: oci_api_key)
   ```

8. **Passphrase?**
   ```
   Pressione ENTER (deixe vazio)
   ```

---

## 🔐 Passo 3: Adicionar chave API no Oracle Cloud

Após configurar, o OCI CLI mostra algo assim:

```
Public key written to: C:\Users\SeuUsuario\.oci\oci_api_key_public.pem
```

**Copie a chave pública:**

```powershell
Get-Content $HOME\.oci\oci_api_key_public.pem
```

**Adicione no Oracle Cloud:**

1. Oracle Cloud → Clique no ícone do usuário → **User Settings**
2. Na aba lateral esquerda: **API Keys**
3. Clique em **Add API Key**
4. Selecione: **Paste Public Key**
5. Cole a chave pública (que você copiou acima)
6. Clique em **Add**

---

## 📝 Passo 4: Coletar IDs necessários

Você precisa de 4 IDs:

### 1️⃣ **Compartment ID** (você já tem)

Está na URL quando você acessa o Oracle Cloud:

```
https://cloud.oracle.com/?tenant=gustavomacha0cchaga6&compartmentId=ocid1.tenancy.oc1..aaaaaXXXXX
                                                                   ^^^^^^^^^^^^^^^^^^^^^^^^^
                                                                   Esse é o Compartment ID
```

OU:

- Menu ☰ → **Governance & Administration** → **Tenancy Details**
- Copie o **OCID** da tenancy

### 2️⃣ **Subnet ID**

- Menu ☰ → **Networking** → **Virtual Cloud Networks**
- Clique em: `chutai-vcn`
- Clique em: `public-subnet-chutai-vcn`
- Copie o **OCID** (começa com `ocid1.subnet.oc1.sa-saopaulo-1..`)

### 3️⃣ **Image ID** (Ubuntu 22.04 ARM64)

Execute no PowerShell:

```powershell
oci compute image list --compartment-id SEU_COMPARTMENT_ID --operating-system "Canonical Ubuntu" --operating-system-version "22.04" --shape "VM.Standard.A1.Flex" --query "data[0].id" --raw-output
```

**Substitua `SEU_COMPARTMENT_ID` pelo Compartment ID que você copiou acima!**

Vai retornar algo como:

```
ocid1.image.oc1.sa-saopaulo-1.aaaaaaaa...
```

### 4️⃣ **Chave SSH Pública** (você já tem)

Se você salvou como `oracle-chutai.pub`, o caminho é:

```
C:\Users\SeuUsuario\.ssh\oracle-chutai.pub
```

Se não salvou ainda, extraia da chave privada:

```powershell
ssh-keygen -y -f $HOME\.ssh\oracle-chutai.key > $HOME\.ssh\oracle-chutai.pub
```

---

## ⚙️ Passo 5: Configurar o Script

1. **Abra o arquivo:**

   ```
   C:\dev\Chutaí\oracle-auto-create.ps1
   ```

2. **Edite as linhas 10-13:**

```powershell
$COMPARTMENT_ID = "ocid1.tenancy.oc1..aaaaaXXXX"        # Cole seu Compartment ID
$SUBNET_ID = "ocid1.subnet.oc1.sa-saopaulo-1.aaaaaXXX" # Cole seu Subnet ID
$IMAGE_ID = "ocid1.image.oc1.sa-saopaulo-1.aaaaaXXXX"  # Cole seu Image ID
$SSH_PUBLIC_KEY_PATH = "$HOME\.ssh\oracle-chutai.pub"  # Caminho da sua chave
```

3. **Salve o arquivo** (Ctrl+S)

---

## 🚀 Passo 6: Executar o Script

```powershell
cd C:\dev\Chutaí
.\oracle-auto-create.ps1
```

O script vai:

- ✅ Verificar instalação do OCI CLI
- ✅ Verificar configuração
- ✅ Tentar criar a instância a cada 30 segundos
- ✅ Tocar um beep quando conseguir
- ✅ Mostrar o IP público da instância

**DEIXE RODANDO!** Pode demorar:

- 5-30 minutos durante o dia
- 1-5 minutos de madrugada
- Instantâneo em horários de baixo uso

---

## 🎯 Quando Conseguir Criar

O script vai mostrar:

```
==================================================
  ✅ INSTÂNCIA CRIADA COM SUCESSO!
==================================================

[INFO] Nome: chutai-bot
[INFO] IP Público: 144.22.XXX.XXX
[INFO] Availability Domain: bUbN:SA-SAOPAULO-1-AD-1

[NEXT] Conecte via SSH:
  ssh -i C:\Users\SeuUsuario\.ssh\oracle-chutai.key ubuntu@144.22.XXX.XXX
```

**Copie o comando SSH e conecte!**

---

## 🔥 Dicas

### Melhores horários para tentar:

- ✅ **02h - 06h** (madrugada) - MELHOR
- ✅ **Sábado/Domingo manhã** - BOM
- ⚠️ **Horário comercial** - DIFÍCIL

### Se não conseguir após 1 hora:

1. Pare o script (Ctrl+C)
2. Tente de madrugada
3. Ou tente criar manualmente em **outro datacenter**:
   - US East (Ashburn) - `us-ashburn-1`
   - US West (Phoenix) - `us-phoenix-1`

---

## ❌ Solução de Problemas

### Erro: "LimitExceeded"

**Problema:** Você já tem instâncias Always Free rodando

**Solução:**

- Menu ☰ → Compute → Instances
- Delete instâncias antigas
- Tente novamente

### Erro: "OCI CLI não encontrado"

**Problema:** OCI CLI não instalado ou não está no PATH

**Solução:**

1. Feche e abra o PowerShell novamente
2. Se não funcionar, adicione ao PATH:
   ```
   C:\Users\SeuUsuario\AppData\Local\Programs\Python\PythonXX\Scripts
   ```

### Erro: "NotAuthenticated"

**Problema:** Configuração da API Key errada

**Solução:**

1. Verifique se adicionou a chave pública no User Settings
2. Refaça o `oci setup config`

---

## 📞 Próximos Passos

Assim que a instância for criada:

1. **Conecte via SSH:**

   ```bash
   ssh -i C:\Users\SeuUsuario\.ssh\oracle-chutai.key ubuntu@SEU_IP
   ```

2. **Configure o servidor** (veja `GUIA-PRODUCAO.md`)

3. **Instale o bot** (veja seção "Deployment" em `DEPLOYMENT.md`)

---

**BOA SORTE! 🍀**
