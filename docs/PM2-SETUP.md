# 🚀 Script de Inicialização para Produção

## Windows (PowerShell)

### Instalação do PM2

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Instalar pm2-windows-startup
npm install -g pm2-windows-startup

# Configurar para iniciar com Windows
pm2-startup install
```

### Iniciar o Bot

```powershell
# Navegue até o diretório do projeto
cd C:\dev\Chutaí

# Inicie o bot com PM2
pm2 start npm --name "chutai-bot" -- run bot

# Salve a configuração
pm2 save

# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs chutai-bot
```

### Comandos Úteis PM2

```powershell
pm2 status              # Ver status de todos os processos
pm2 logs chutai-bot     # Ver logs em tempo real
pm2 restart chutai-bot  # Reiniciar bot
pm2 stop chutai-bot     # Parar bot
pm2 delete chutai-bot   # Remover bot do PM2
pm2 monit               # Monitor em tempo real
```

---

## Linux (Ubuntu/Debian)

### Instalação do PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar para iniciar com o sistema
pm2 startup
# (execute o comando que o PM2 mostrar)

pm2 save
```

### Iniciar o Bot

```bash
# Navegue até o diretório do projeto
cd /home/usuario/chutai

# Inicie o bot com PM2
pm2 start npm --name "chutai-bot" -- run bot

# Salve a configuração
pm2 save

# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs chutai-bot
```

### Comandos Úteis PM2

```bash
pm2 status              # Ver status
pm2 logs chutai-bot     # Logs em tempo real
pm2 restart chutai-bot  # Reiniciar
pm2 stop chutai-bot     # Parar
pm2 delete chutai-bot   # Remover
pm2 monit               # Monitor
```

---

## Railway.app / Render

Não precisa PM2, use os scripts do package.json:

**Procfile** (crie na raiz do projeto):

```
worker: npm run start
```

**Ou configure "Start Command":**

```
npm run start
```

---

## Docker (Opcional)

Se quiser usar Docker:

**Dockerfile:**

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Instalar dependências do Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["npm", "run", "start"]
```

**docker-compose.yml:**

```yaml
version: "3.8"

services:
  bot:
    build: .
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    volumes:
      - ./auth_info_baileys:/app/auth_info_baileys
```

**Iniciar:**

```bash
docker-compose up -d
```

---

## ⚙️ Configurações Recomendadas

### Fuso Horário

**Windows:** Já usa horário do sistema

**Linux:**

```bash
# Ver fuso horário atual
timedatectl

# Configurar para Brasília
sudo timedatectl set-timezone America/Sao_Paulo

# Verificar
date
```

### Memória

O bot usa ~200-400MB de RAM normalmente.

**Configurar limite no PM2 (opcional):**

```bash
pm2 start npm --name "chutai-bot" --max-memory-restart 500M -- run bot
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
pm2 logs chutai-bot --lines 100
```

### Ver Métricas

```bash
pm2 monit
```

### Logs Salvos

```bash
# Ver localização dos logs
pm2 info chutai-bot

# Geralmente em:
# Linux: ~/.pm2/logs/
# Windows: C:\Users\<usuario>\.pm2\logs\
```

---

## 🔄 Atualização do Bot

```bash
# 1. Parar bot
pm2 stop chutai-bot

# 2. Atualizar código (se usar Git)
git pull

# 3. Instalar novas dependências (se houver)
npm install

# 4. Reiniciar bot
pm2 restart chutai-bot

# 5. Ver logs
pm2 logs chutai-bot
```

---

## 🆘 Troubleshooting

### Bot não inicia

```bash
# Ver logs de erro
pm2 logs chutai-bot --err

# Tentar iniciar manualmente para ver erro
npm run bot
```

### Bot para sozinho

```bash
# Ver se está rodando
pm2 status

# Ver logs
pm2 logs chutai-bot

# Reiniciar
pm2 restart chutai-bot
```

### Erro "ECONNREFUSED" no banco

- Verifique se DATABASE_URL está correta no .env
- Teste conexão: `npx prisma db push`

---

## ✅ Checklist de Produção

- [ ] PM2 instalado
- [ ] Bot iniciado com PM2
- [ ] PM2 configurado para iniciar com sistema
- [ ] Fuso horário correto (America/Sao_Paulo)
- [ ] Logs sendo gerados corretamente
- [ ] WhatsApp conectado
- [ ] Grupo configurado (!setupgrupo)
- [ ] Rodada sincronizada (!proxima)
- [ ] Notificações automáticas funcionando
- [ ] Backup da pasta auth_info_baileys configurado

---

**🎉 Bot rodando em produção com PM2!**
