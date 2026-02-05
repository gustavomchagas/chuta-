# Servidor Server Space - Chutaí Bot

## 📋 Informações do Servidor

- **Provedor**: Server Space
- **IP**: 92.246.129.3
- **Localização**: São Paulo, Brasil
- **SO**: Ubuntu 22.04.2 LTS
- **Node.js**: v20.20.0
- **Recursos**: 1 vCPU, 1GB RAM, 25GB SSD, 50Mbps

## 🔐 Credenciais

### Servidor

- **Usuário**: root
- **Chave SSH**: `C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk`

### Banco de Dados PostgreSQL

- **Host**: localhost
- **Database**: chutai
- **Usuário**: chutai
- **Senha**: `ztQSaULHiNA02umGsk58`

## 🚀 Gerenciamento

### Scripts Disponíveis

| Script                         | Função                                     |
| ------------------------------ | ------------------------------------------ |
| `manage-server.ps1`            | Gerenciar servidor (status, logs, restart) |
| `connect-whatsapp.ps1`         | Conectar WhatsApp ao bot                   |
| `open-admin.ps1`               | Abrir painel administrativo                |
| `serverspace-deploy-plink.ps1` | Deploy completo                            |

### Gerenciamento do Servidor

```powershell
# Ver status
.\manage-server.ps1 status

# Ver logs em tempo real
.\manage-server.ps1 logs

# Reiniciar bot
.\manage-server.ps1 restart

# Parar bot
.\manage-server.ps1 stop

# Iniciar bot
.\manage-server.ps1 start

# Conectar via SSH
.\manage-server.ps1 connect
```

## 📁 Estrutura no Servidor

```
/opt/chutai/
├── src/
│   ├── bot.ts          (aplicação principal)
│   ├── admin.ts
│   └── ...
├── prisma/
│   └── schema.prisma
├── package.json
├── .env
└── node_modules/
```

## 🔧 Comandos Úteis

### PM2 (Process Manager)

```bash
# Status de todos os processos
pm2 status

# Logs em tempo real
pm2 logs chutai-bot

# Reiniciar
pm2 restart chutai-bot

# Parar
pm2 stop chutai-bot

# Informações detalhadas
pm2 show chutai-bot

# Monitoramento
pm2 monit
```

### PostgreSQL

```bash
# Conectar ao banco
psql -U chutai -d chutai

# Ver tabelas
\dt

# Sair
\q
```

### Sistema

```bash
# Uso de memória
free -h

# Uso de disco
df -h

# Processos ativos
top

# Logs do sistema
journalctl -xe
```

## 🔄 Atualizar Aplicação

Para atualizar o código no servidor:

```bash
# Conectar ao servidor
.\manage-server.ps1 connect

# No servidor:
cd /opt/chutai
pm2 stop chutai-bot
git pull  # se usar git, ou copie os arquivos manualmente
npm install  # se houver novas dependências
npx prisma migrate deploy  # se houver migrations
pm2 start chutai-bot
```

Ou use pscp para copiar arquivos:

```powershell
$pscp = "$env:TEMP\pscp.exe"
$ppk = "C:\Users\Gustavo\Documents\.ssh\chutai-vps.ppk"
$hostkey = "SHA256:rKV1icKuFRtnZH/5WZhMXv3SVpDy8C8kMezI7P/mQss"

# Copiar arquivo específico
& $pscp -i $ppk -hostkey $hostkey "src\bot.ts" "root@92.246.129.3:/opt/chutai/src/"

# Reiniciar bot
.\manage-server.ps1 restart
```

## 💰 Custos

- **Plano atual**: R$ 23,41/mês (R$ 0,03/hora)
- **Cobrado por uso**: Sim
- **Tráfego**: Ilimitado
- **Bônus**: +3% a partir de R$ 500 gasto

## 🆘 Troubleshooting

### Bot não está rodando

```bash
.\manage-server.ps1 connect
cd /opt/chutai
pm2 logs chutai-bot --lines 50
```

### Erro de banco de dados

```bash
# Verificar se PostgreSQL está rodando
systemctl status postgresql

# Reiniciar PostgreSQL
systemctl restart postgresql

# Ver logs do PostgreSQL
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Falta de memória

```bash
# Ver uso de memória
free -h

# Processos que mais usam memória
ps aux --sort=-%mem | head -10

# Limpar cache
sync; echo 3 > /proc/sys/vm/drop_caches
```

## 📊 Monitoramento

Verifique regularmente:

1. **Status do bot**: `.\manage-server.ps1 status`
2. **Logs**: `.\manage-server.ps1 logs`
3. **Uso de recursos**: Painel Server Space
4. **Custo acumulado**: Painel Server Space > Finanças

## 🔒 Segurança

- ✅ Autenticação SSH por chave
- ✅ Firewall habilitado
- ✅ Banco de dados com senha forte
- ✅ Arquivo .env protegido (permissões 600)

## 📞 Suporte

- **Server Space**: https://serverspace.com.br
- **Documentação**: https://serverspace.io/support/
- **Chat**: Disponível no painel

---

**Criado em**: 03/02/2026 22:03
**Última atualização**: 03/02/2026 22:05
