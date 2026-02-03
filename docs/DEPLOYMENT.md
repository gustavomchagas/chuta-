# 🚀 Guia de Deploy e Produção - Chutaí Bot

## 📋 Índice

1. [Opções de Hospedagem](#opções-de-hospedagem)
2. [Preparação para Produção](#preparação-para-produção)
3. [Conectar Novo WhatsApp](#conectar-novo-whatsapp)
4. [Limpeza de Dados de Teste](#limpeza-de-dados-de-teste)
5. [Monitoramento e Manutenção](#monitoramento-e-manutenção)

---

## 🌐 Opções de Hospedagem

### ⚠️ Comparação de Custos Reais

| Opção            | Custo/Mês | Precisa PC Ligado 24/7? | Uptime     | Recomendação       |
| ---------------- | --------- | ----------------------- | ---------- | ------------------ |
| **VPS Contabo**  | ~R$ 27    | ❌ NÃO                  | 99.9%      | 🥇 **MELHOR**      |
| PC em Casa       | ~R$ 58\*  | ✅ SIM                  | 90-99%\*\* | ❌ Não vale a pena |
| Render (grátis)  | R$ 0      | ❌ NÃO                  | 40%\*\*\*  | ⚠️ Com limitações  |
| Railway (grátis) | R$ 0      | ❌ NÃO                  | ~65%       | ⚠️ 16h/dia         |

\* Custo de energia: PC 100W × 24h × 30d × R$0,80/kWh = R$ 58/mês  
** Depende de quedas de energia/internet  
\*** Hiberna após inatividade

💡 **CONCLUSÃO: VPS custa MENOS que deixar PC ligado e é muito mais confiável!**

---

### 1. 🥇 **VPS Contabo** (RECOMENDADO - Melhor Custo-Benefício)

**💰 Custo:**

- **Grátis**: $5 em créditos mensais (suficiente para ~500 horas/mês)
- **Pago**: $5/mês para uso ilimitado

**✅ Vantagens:**

- Setup super fácil (conecta direto com GitHub)
- Deploy automático a cada commit
- Logs em tempo real
- Suporta PostgreSQL (Neon já configurado)
- Mantém bot rodando 24/7
- 500GB de banda mensal grátis

**❌ Limitações:**

- Plano grátis tem limite de ~500 horas/mês (~16h por dia)
- Após limite, bot para até próximo mês

**📝 Como Fazer:**

1. Crie conta em https://railway.app
2. Conecte seu repositório GitHub
3. Clique em "New Project" → "Deploy from GitHub repo"
4. Selecione o repositório do Chutaí
5. Configure variáveis de ambiente:
   - `DATABASE_URL` (sua URL do Neon)
   - `NODE_ENV=production`
6. Adicione comando de start:
   ```json
   {
     "scripts": {
       "start": "tsx src/bot.ts"
     }
   }
   ```
7. Deploy automático! 🚀

**⚠️ IMPORTANTE:** Railway hiberna após inatividade. Para manter 24/7, ative "Always On" nas configurações.

---

### 2. 🆓 **Render.com** (Grátis com Limitações)

**💰 Custo:**

- **Grátis**: Ilimitado, mas com hibernação
- **Pago**: $7/mês sem hibernação

**✅ Vantagens:**

- 100% gratuito (com limitações)
- Deploy automático via GitHub
- SSL grátis
- Logs completos

**❌ Limitações:**

- **Hiberna após 15 minutos de inatividade**
- Leva ~30 segundos para "acordar"
- Pode perder mensagens durante hibernação

**📝 Como Fazer:**

1. Crie conta em https://render.com
2. New → Web Service
3. Conecte GitHub repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm run bot`
   - **Environment:** Add `DATABASE_URL`
5. Deploy!

**⚠️ Problema:** Bot hiberna quando não há requisições HTTP. Para WhatsApp, isso significa que pode hibernar e perder mensagens.

**💡 Solução:** Configure um cron job para fazer ping a cada 10 minutos (mas isso não é ideal).

---

### 3. 💻 **VPS - Contabo/Hetzner** (Melhor Custo-Benefício)

**💰 Custo:**

- **Contabo**: €4.99/mês (~R$ 27/mês) - VPS 4GB RAM
- **Hetzner**: €4.51/mês (~R$ 25/mês) - VPS 4GB RAM
- **Oracle Cloud**: GRÁTIS (Always Free Tier - limitado)

**✅ Vantagens:**

- **Roda 24/7 sem interrupções**
- Controle total
- Pode rodar múltiplos bots
- Performance excelente

**❌ Desvantagens:**

- Requer conhecimento básico de Linux
- Você gerencia tudo (atualizações, segurança)

**📝 Como Fazer (Contabo/Hetzner):**

```bash
# 1. Conecte via SSH
ssh root@seu-servidor-ip

# 2. Instale Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instale PM2 (gerenciador de processos)
npm install -g pm2

# 4. Clone o repositório
git clone https://github.com/seu-usuario/chutai.git
cd chutai

# 5. Instale dependências
npm install

# 6. Configure .env
nano .env
# Cole sua DATABASE_URL

# 7. Inicie com PM2
pm2 start npm --name "chutai-bot" -- run bot
pm2 startup
pm2 save

# Bot está rodando 24/7! 🎉
```

**PM2 Comandos Úteis:**

```bash
pm2 status          # Ver status
pm2 logs chutai-bot # Ver logs em tempo real
pm2 restart chutai-bot # Reiniciar
pm2 stop chutai-bot # Parar
```

---

### 4. 🆓 **Oracle Cloud (Always Free)** (Complicado mas GRÁTIS)

**💰 Custo:**

- **100% GRÁTIS PARA SEMPRE**

**✅ Vantagens:**

- VM gratuita para sempre (ARM64 - 4 cores, 24GB RAM)
- Sem limite de tempo
- 10TB de banda mensal grátis

**❌ Desvantagens:**

- Setup mais complicado
- Requer cartão de crédito (não cobra)
- Arquitetura ARM (precisa build específico)

**📝 Como Fazer:**

1. Crie conta em https://cloud.oracle.com
2. Crie uma VM (Ampere A1 - Always Free)
3. Siga os mesmos passos do VPS acima
4. Configure firewall para permitir conexões

---

### 5. 💻 **PC/Notebook em Casa** (❌ NÃO RECOMENDADO)

**💰 Custo Real:**

- **Energia**: ~R$ 58/mês (PC 100W × 24h × 30d × R$0,80/kWh)
- **Mais caro que VPS Contabo!** (€4.99/mês = ~R$ 27/mês)

**✅ Vantagens:**

- Controle total
- Dados ficam com você

**❌ Desvantagens:**

- ⚠️ **Precisa deixar PC ligado 24/7**
- 💰 **Custo de energia maior que VPS**
- ⚡ Vulnerável a quedas de energia/internet
- 🌡️ Desgaste do hardware
- 💤 PC pode hibernar/atualizar sozinho
- 🏠 Barulho/calor em casa

**💡 Conclusão: Use VPS, é mais barato e confiável!**

**📝 Como Fazer (se ainda quiser usar):**

**Windows (com PM2):**

```powershell
# 1. Instale PM2
npm install -g pm2

# 2. Navegue até o projeto
cd C:\dev\Chutaí

# 3. Inicie o bot
pm2 start npm --name "chutai-bot" -- run bot

# 4. Configure para iniciar com Windows
pm2 startup
pm2 save

# 5. Configure para não dormir
# Windows → Configurações → Sistema → Energia e Suspensão
# → Suspender: Nunca
```

**Linux:**

```bash
# Mesmos comandos do VPS acima
# + Desabilite suspensão automática
```

---

## 🎯 Recomendação Final

### ⚠️ IMPORTANTE: PC em casa precisa ficar ligado 24/7!

**Análise de custo real:**

| Opção           | Setup | Custo/Mês | Precisa PC 24/7? | Confiabilidade   |
| --------------- | ----- | --------- | ---------------- | ---------------- |
| **VPS Contabo** | Médio | ~R$ 27    | ❌ NÃO           | 99.9% ⭐⭐⭐⭐⭐ |
| PC em Casa      | Fácil | ~R$ 58\*  | ✅ SIM           | 90% ⭐⭐⭐       |
| Render.com      | Fácil | R$ 0      | ❌ NÃO           | 40%\*\* ⭐⭐     |
| Railway.app     | Fácil | R$ 0      | ❌ NÃO           | 65%\*\*\* ⭐⭐⭐ |

\* Energia do PC ligado 24/7  
** Hiberna após inatividade  
\*** ~16h por dia no plano grátis

---

### Para uso pessoal/amigos (10-50 pessoas):

**🥇 1ª Opção: VPS Contabo** (€4.99/mês = ~R$ 27/mês) - **RECOMENDADO**

- ✅ Mais barato que energia do PC 24/7
- ✅ 100% confiável
- ✅ Roda 24/7 sem interrupções
- ✅ Não precisa deixar PC ligado
- ✅ Setup simples com tutorial completo

**🥈 2ª Opção: Railway.app** (plano grátis)

- ✅ Grátis
- ⚠️ Fica online ~16h por dia
- ✅ Setup muito fácil via GitHub
- ⚠️ Pode não cobrir todos os horários de jogos

**🥉 3ª Opção: PC em casa**

- ⚠️ **Precisa deixar ligado 24/7**
- ⚠️ Custo de energia MAIOR que VPS (~R$ 58/mês)
- ⚠️ Vulnerável a quedas de energia/internet
- ❌ Não recomendado

### Para uso comercial/muitos grupos:

**VPS Contabo ou Hetzner** (controle total e 100% uptime)

---

## 🔧 Preparação para Produção

### 1. Criar Novo Número WhatsApp

**Opção A - Usar Número Pessoal:**

- ⚠️ Não recomendado (pode ser bloqueado)
- WhatsApp não permite bots em números pessoais oficialmente

**Opção B - Criar Chip/Linha Nova (RECOMENDADO):**

1. Compre um chip pré-pago (operadora qualquer)
2. Ative o WhatsApp neste chip
3. **IMPORTANTE:** Não use WhatsApp Business (use normal)
4. Use este número apenas para o bot

**Opção C - WhatsApp Business API (Oficial):**

- Custo: ~R$ 50-200/mês
- Totalmente legal e permitido
- Requer aprovação do Facebook

---

### 2. Backup dos Dados de Teste

Antes de limpar tudo, faça backup:

```powershell
# Backup do banco de dados
npx prisma db pull

# Backup da autenticação do WhatsApp
Copy-Item -Path "auth_info_baileys" -Destination "auth_info_baileys_BACKUP" -Recurse
```

---

### 3. Limpar Dados de Teste

**IMPORTANTE:** Faça isso ANTES de conectar o WhatsApp de produção!

**Opção A - Limpar TUDO (Recomendado para Produção):**

```sql
-- Execute no Prisma Studio ou via SQL
-- 1. Abra Prisma Studio
npx prisma studio

-- 2. Delete manualmente:
-- - Todos os Players
-- - Todos os Matches
-- - Todos os Bets
-- - Todas as Notifications
-- - Todos os Groups
```

**Opção B - Via Script (Mais Rápido):**

Crie arquivo `clean-database.ts`:

```typescript
import { prisma } from "./src/lib/prisma";

async function cleanDatabase() {
  console.log("🧹 Limpando banco de dados...\n");

  // Apaga tudo em ordem (devido a foreign keys)
  const bets = await prisma.bet.deleteMany();
  console.log(`✅ ${bets.count} apostas apagadas`);

  const notifications = await prisma.notification.deleteMany();
  console.log(`✅ ${notifications.count} notificações apagadas`);

  const matches = await prisma.match.deleteMany();
  console.log(`✅ ${matches.count} jogos apagados`);

  const players = await prisma.player.deleteMany();
  console.log(`✅ ${players.count} jogadores apagados`);

  const groups = await prisma.group.deleteMany();
  console.log(`✅ ${groups.count} grupos apagados`);

  console.log("\n🎉 Banco de dados limpo!\n");
  console.log(
    "⚠️ ATENÇÃO: Você ainda precisa desconectar o WhatsApp de teste!\n",
  );

  await prisma.$disconnect();
}

cleanDatabase();
```

Execute:

```powershell
npx tsx clean-database.ts
```

---

### 4. Desconectar WhatsApp de Teste

**Método 1 - Apagar Pasta de Autenticação:**

```powershell
# No diretório do projeto
Remove-Item -Path "auth_info_baileys" -Recurse -Force
```

**Método 2 - Desconectar pelo WhatsApp:**

1. No celular com WhatsApp de teste
2. Configurações → Aparelhos Conectados
3. Encontre "Chutaí Bot"
4. Desconectar

---

## 📱 Conectar Novo WhatsApp em Produção

### Passo a Passo Completo:

**1. Certifique-se que:**

- ✅ Banco de dados está limpo
- ✅ Pasta `auth_info_baileys` foi apagada
- ✅ WhatsApp de teste foi desconectado
- ✅ Novo chip/número está pronto

**2. Inicie o bot:**

```powershell
npm run bot
```

**3. Escaneie QR Code:**

O bot vai exibir um QR Code no terminal:

```
📱 Escaneie o QR Code abaixo com seu WhatsApp:

█████████████████████████████
█████████████████████████████
███████▀▀▀█████▀▀▀███████████
███████ ... (QR Code) ... ███
█████████████████████████████
█████████████████████████████
```

**4. No celular COM O NOVO NÚMERO:**

1. Abra WhatsApp
2. Menu (⋮) → Aparelhos conectados
3. Conectar aparelho
4. Aponte a câmera para o QR Code

**5. Aguarde confirmação:**

```
✅ Bot conectado ao WhatsApp!
📍 Grupo configurado: (nenhum ainda)
```

**6. Configure o grupo oficial:**

No grupo do bolão no WhatsApp, envie:

```
!setupgrupo
```

Bot responde:

```
✅ GRUPO CONFIGURADO COM SUCESSO! ✅

Este grupo agora é o grupo oficial do BOLÃO BRASILEIRÃO 2026! 🏆⚽

━━━━━━━━━━━━━━━━━━━━

👥 ATENÇÃO @todos

O bot está ativo e pronto para receber seus palpites!

🎯 Digite !config para ver todas as regras
🎮 Digite !ajuda para ver todos os comandos

━━━━━━━━━━━━━━━━━━━━

🤖 BOA SORTE A TODOS! ⚽
```

**7. Sincronize a primeira rodada:**

```
!proxima
```

**8. PRONTO! Bot está em produção! 🎉**

---

## ⚙️ Checklist Final Antes de Produção

### ✅ Preparação:

- [ ] Banco de dados limpo
- [ ] WhatsApp de teste desconectado
- [ ] Pasta `auth_info_baileys` apagada
- [ ] Novo chip/número preparado
- [ ] Hospedagem escolhida e configurada
- [ ] Backup de arquivos importantes feito

### ✅ Deploy:

- [ ] Bot iniciado na hospedagem
- [ ] Novo WhatsApp conectado com sucesso
- [ ] Grupo oficial criado no WhatsApp
- [ ] Comando `!setupgrupo` executado
- [ ] Comando `!proxima` executado (rodada sincronizada)
- [ ] Teste de palpite feito

### ✅ Validação:

- [ ] Bot respondendo a comandos
- [ ] Palpites sendo registrados
- [ ] Notificações automáticas funcionando
- [ ] Schedulers ativos (verificar logs)
- [ ] Sincronização SofaScore OK

---

## 🔄 Migração de Hospedagem (Se Necessário)

Se decidir mudar de hospedagem depois:

**1. Backup Completo:**

```powershell
# Backup autenticação WhatsApp (CRÍTICO!)
Copy-Item -Path "auth_info_baileys" -Destination "auth_backup" -Recurse

# Backup .env
Copy-Item -Path ".env" -Destination ".env.backup"
```

**2. Na Nova Hospedagem:**

```bash
# Clone o projeto
git clone seu-repositorio

# Restaure autenticação
# (copie pasta auth_info_baileys do backup)

# Restaure .env
# (copie DATABASE_URL)

# Inicie
npm install
npm run bot
```

**✅ Bot vai reconectar automaticamente sem precisar escanear QR Code!**

---

## 📊 Monitoramento e Manutenção

### Logs do Bot

**Ver logs em tempo real:**

```bash
# Se usando PM2
pm2 logs chutai-bot

# Se rodando direto
# (logs aparecem no terminal)
```

**Sinais de que está funcionando:**

```
✅ Bot conectado ao WhatsApp!
📍 Grupo configurado: 5511999999999@g.us
⏰ Scheduler de notificações matinais ativado (8h)
⏰ Scheduler de lembretes ativado (a cada 3h)
🌐 Scheduler SofaScore ativado:
   • Busca jogos do dia às 6h da manhã
   • Verifica nova rodada às 2h da manhã (segunda-feira)
   • Verifica jogos adiados às 10h da manhã
   • Atualiza resultados em tempo real a cada 2 minutos
```

### Backup Automático (Recomendado)

Configure backup automático da pasta `auth_info_baileys`:

**Windows (Task Scheduler):**

```powershell
# Crie script backup-bot.ps1
$source = "C:\dev\Chutaí\auth_info_baileys"
$destination = "C:\Backups\chutai_$(Get-Date -Format 'yyyy-MM-dd').zip"
Compress-Archive -Path $source -DestinationPath $destination

# Agende para rodar diariamente
```

**Linux (Cron):**

```bash
# Adicione ao crontab
0 3 * * * tar -czf /backup/chutai_$(date +\%Y-\%m-\%d).tar.gz /home/usuario/chutai/auth_info_baileys
```

---

## 🆘 Troubleshooting Comum

### Bot não conecta no WhatsApp

**Causa:** QR Code expirado
**Solução:** Reinicie o bot e escaneie rapidamente

### Bot desconecta sozinho

**Causa:** WhatsApp detectou atividade suspeita
**Solução:**

1. Use número exclusivo para o bot
2. Evite usar WhatsApp Business
3. Não use VPNs
4. Mantenha bot rodando 24/7 (desconexões frequentes são suspeitas)

### "Erro ao sincronizar jogos"

**Causa:** SofaScore bloqueou requisições
**Solução:** Aguarde 30 minutos e tente novamente

### Notificações não saem

**Causa:** Scheduler não está rodando ou horário errado
**Solução:** Verifique fuso horário do servidor

```bash
# Ver fuso horário
timedatectl

# Configurar para Brasília (se necessário)
sudo timedatectl set-timezone America/Sao_Paulo
```

---

## 💰 Resumo de Custos

| Opção                | Custo Mensal       | Uptime  | Complexidade |
| -------------------- | ------------------ | ------- | ------------ |
| **PC em Casa**       | R$ 10-20 (energia) | 99%\*   | Fácil        |
| **Railway (grátis)** | R$ 0               | ~65%    | Muito Fácil  |
| **Railway (pago)**   | R$ 27              | 99.9%   | Muito Fácil  |
| **Render (grátis)**  | R$ 0               | 40%\*\* | Fácil        |
| **Contabo VPS**      | R$ 27              | 99.9%   | Médio        |
| **Hetzner VPS**      | R$ 25              | 99.9%   | Médio        |
| **Oracle Cloud**     | R$ 0               | 99.9%   | Difícil      |

\* Depende da estabilidade da sua internet/energia  
\*\* Hiberna após inatividade

---

## 🎯 Recomendação Final por Perfil

### 👥 Bolão com Amigos (10-30 pessoas):

→ **PC em Casa** com PM2

- Mais simples
- Totalmente grátis
- Você controla tudo

### 🏢 Bolão Maior (30-100 pessoas):

→ **VPS Contabo** (€4.99/mês)

- Confiável 24/7
- Custo baixo
- Performance garantida

### 💻 Quer Aprender/Testar:

→ **Railway.app** (plano grátis)

- Setup em 5 minutos
- Perfeito para começar
- Pode migrar depois

---

**🎉 Pronto! Você tem todas as informações para colocar o bot em produção!**

Qualquer dúvida, consulte este guia ou os logs do bot.
