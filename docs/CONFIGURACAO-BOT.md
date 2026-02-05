# Guia: Configuração do Bot

## 1️⃣ Como Conectar o WhatsApp

### Opção A: Via Script (Recomendado)

```powershell
.\connect-whatsapp.ps1
```

### Opção B: Manual

1. Ver logs do bot:

```powershell
.\manage-server.ps1 logs
```

2. Procure por um QR Code (quadrado com caracteres █ e ░)

3. Escaneie com WhatsApp:
   - Abra WhatsApp no celular
   - Menu (⋮) → **Aparelhos conectados**
   - **Conectar um aparelho**
   - Escaneie o QR Code

### ⚠️ Importante sobre Autenticação

Os arquivos de autenticação ficam salvos em `/opt/chutai/auth_info_baileys/` no servidor.

**Para usar um WhatsApp diferente:**

```bash
# Conectar ao servidor
.\manage-server.ps1 connect

# No servidor:
cd /opt/chutai
pm2 stop chutai-bot
rm -rf auth_info_baileys/
pm2 start chutai-bot
```

Um novo QR Code será gerado.

---

## 2️⃣ Testar em Grupo Não Oficial e Depois Limpar

### ✅ Sim, você pode fazer isso!

O processo ideal é:

### Fase de Testes

1. **Conecte o WhatsApp** (como descrito acima)

2. **Crie um grupo de teste** no WhatsApp
   - Adicione apenas você e algumas pessoas de confiança
   - Adicione o bot no grupo

3. **Configure o bot** para esse grupo de teste:

```bash
# Conectar ao servidor
.\manage-server.ps1 connect

# No servidor, acesse o banco de dados
psql -U chutai -d chutai

# Ver grupos disponíveis
SELECT * FROM "Group";

# Configurar o grupo de teste como ativo
UPDATE "Group" SET active = true WHERE id = 'ID_DO_GRUPO_TESTE';

# Sair do psql
\q
```

4. **Teste todas as funcionalidades**:
   - Registrar apostas
   - Criar rodadas
   - Ver resultados
   - Testar comandos de admin

### Limpeza Completa dos Dados

Quando estiver pronto para usar no grupo oficial:

```bash
# Conectar ao servidor
.\manage-server.ps1 connect

# No servidor:
cd /opt/chutai
pm2 stop chutai-bot

# Limpar banco de dados
psql -U chutai -d chutai << EOF
-- Apagar TODOS os dados de teste
TRUNCATE TABLE "Bet" CASCADE;
TRUNCATE TABLE "Match" CASCADE;
TRUNCATE TABLE "Round" CASCADE;
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Group" CASCADE;
-- Resetar sequências
ALTER SEQUENCE "Bet_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Match_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Round_id_seq" RESTART WITH 1;
ALTER SEQUENCE "User_id_seq" RESTART WITH 1;
EOF

# Reiniciar bot
pm2 start chutai-bot
```

**Agora está limpo!** Adicione o bot no grupo oficial e comece do zero.

### ⚠️ Alternativa Mais Segura: Usar Dois Bancos

Se preferir manter os dados de teste:

```bash
# Criar banco de produção
psql -U chutai << EOF
CREATE DATABASE chutai_producao OWNER chutai;
EOF

# Alterar .env para usar o novo banco
echo "DATABASE_URL=postgresql://chutai:ztQSaULHiNA02umGsk58@localhost:5432/chutai_producao" > /opt/chutai/.env

# Reiniciar
pm2 restart chutai-bot
```

---

## 3️⃣ Como Acessar o Painel de Administração

### Acesso Via Túnel SSH (Recomendado)

Execute o script para criar o túnel:

```powershell
.\tunnel-admin.ps1
```

Então acesse: **http://localhost:3334**

⚠️ **Importante:** Mantenha o terminal aberto! O painel só funciona enquanto o túnel estiver ativo.

Para encerrar o túnel, pressione `Ctrl+C` no terminal.

### Como Funciona?

- O painel roda no servidor na porta **3334**
- O túnel SSH redireciona para sua máquina local
- Você acessa via `localhost:3334` como se estivesse rodando localmente

### Verificar se o Painel Está Rodando

```powershell
.\manage-server.ps1 status
```

### Se o painel NÃO estiver rodando:

```bash
# Conectar ao servidor
.\manage-server.ps1 connect

# No servidor
cd /opt/chutai
pm2 start src/admin.ts --name chutai-admin --interpreter npx --interpreter-args tsx
pm2 save
```

### Credenciais do Painel

O painel não requer login no momento. Se precisar configurar autenticação, verifique o código em `src/admin.ts`.

---

## 📋 Resumo do Fluxo Completo

### Testes (Recomendado)

1. ✅ Conectar WhatsApp → `.\connect-whatsapp.ps1`
2. ✅ Criar grupo de teste
3. ✅ Testar funcionalidades
4. ✅ Limpar dados → Script SQL acima
5. ✅ Usar no grupo oficial

### Acesso Administrativo

1. ✅ Criar túnel SSH → `.\tunnel-admin.ps1`
2. ✅ Acessar http://localhost:3334
3. ✅ Gerenciar jogos, rodadas e resultados
4. ⚠️ Manter terminal do túnel aberto durante o uso

---

## 🛠️ Scripts Úteis Criados

| Script                         | Função                                     |
| ------------------------------ | ------------------------------------------ |
| `manage-server.ps1`            | Gerenciar servidor (status, logs, restart) |
| `connect-local.ps1`            | Conectar WhatsApp localmente               |
| `tunnel-admin.ps1`             | Criar túnel SSH para painel admin          |
| `serverspace-deploy-plink.ps1` | Deploy completo                            |

---

## 🆘 Problemas Comuns

### QR Code não aparece

```bash
pm2 restart chutai-bot
pm2 logs chutai-bot
```

### Bot não responde no grupo

1. Verifique se está conectado: `pm2 logs chutai-bot`
2. Veja se o grupo está ativo no banco
3. Reinicie: `pm2 restart chutai-bot`

### Painel não abre

1. Verifique se está rodando: `pm2 list`
2. Veja os logs: `pm2 logs chutai-admin`
3. Verifique a porta no código

---

**Precisa de ajuda?** Execute `.\manage-server.ps1 logs` para ver o que está acontecendo!
