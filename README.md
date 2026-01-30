# 🎯 Chutaí - Bolão de Futebol via WhatsApp

Sistema de bolão de futebol para grupos de amigos, com bot de WhatsApp integrado para palpites.

## 🚀 Funcionalidades

- ✅ Bot de WhatsApp para enviar jogos e receber palpites
- ✅ Parser inteligente de palpites (aceita vários formatos)
- ✅ Painel web admin para cadastrar jogos e resultados
- ✅ Cálculo automático de pontuação
- ✅ Ranking em tempo real
- ✅ Histórico completo de palpites por rodada

## 📊 Sistema de Pontuação

| Resultado       | Pontos |
| --------------- | ------ |
| Placar exato    | 2 pts  |
| Resultado certo | 1 pt   |

**Exemplos:**

- Jogo: Flamengo 2x1 Vasco
- Palpite: 2x1 → **2 pontos** (placar exato!)
- Palpite: 3x0 → **1 ponto** (acertou vitória do mandante)
- Palpite: 0x0 → **0 pontos** (errou o resultado)

## 🛠️ Tecnologias

- **Backend**: Node.js + TypeScript + Fastify
- **Banco de Dados**: PostgreSQL (Neon Cloud)
- **ORM**: Prisma
- **WhatsApp**: Baileys

## 📦 Estrutura do Projeto

```
Chutaí/
├── prisma/
│   └── schema.prisma      # Modelos do banco de dados
├── src/
│   ├── admin.ts           # Servidor do painel admin (porta 3334)
│   ├── bot.ts             # Inicializador do bot WhatsApp
│   ├── lib/
│   │   └── prisma.ts      # Cliente do Prisma
│   ├── public/
│   │   └── index.html     # Interface do painel admin
│   ├── utils/
│   │   ├── betParser.ts   # Parser inteligente de palpites
│   │   └── teams.ts       # Aliases de times brasileiros
│   └── whatsapp/
│       └── smartBot.ts    # Bot principal do WhatsApp
├── .env                   # Variáveis de ambiente
└── package.json
```

## 🚀 Como Usar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar banco de dados

Crie um arquivo `.env` com:

```env
DATABASE_URL="postgresql://usuario:senha@host/database?sslmode=require"
```

Aplique o schema:

```bash
npx prisma db push
```

### 3. Iniciar o Painel Admin

```bash
npm run admin
```

Acesse: http://localhost:3334

### 4. Iniciar o Bot do WhatsApp

```bash
npm run bot
```

Escaneie o QR Code com seu WhatsApp.

## 📱 Comandos do Bot

| Comando     | Descrição                          |
| ----------- | ---------------------------------- |
| `!config`   | Configura o grupo atual como bolão |
| `!jogos`    | Mostra jogos da rodada             |
| `!ranking`  | Mostra ranking atual               |
| `!faltam`   | Lista quem falta palpitar          |
| `!palpites` | Mostra todos os palpites           |
| `!meus`     | Mostra seus palpites               |
| `!ajuda`    | Lista de comandos                  |

## 📝 Formatos de Palpites Aceitos

O bot aceita palpites em vários formatos:

```
# Por número do jogo
1) 2x1
2) 0x0
3) 1x2

# Lista separada por vírgula
2x1, 0x0, 1x2

# Com nome dos times
Flamengo 2x1 Vasco
fla 2x1 vas
```

## 🗄️ Modelos do Banco de Dados

### Player (Jogadores)

- `id`, `phone`, `name`, `isAdmin`, `createdAt`

### Match (Jogos)

- `id`, `round`, `homeTeam`, `awayTeam`, `matchDate`, `homeScore`, `awayScore`, `status`

### Bet (Palpites)

- `id`, `playerId`, `matchId`, `homeScoreGuess`, `awayScoreGuess`, `points`, `createdAt`

## 📋 Fluxo de Uso

1. **Admin cadastra jogos** no painel web (http://localhost:3334)
2. **Bot envia jogos** para o grupo (`!jogos`)
3. **Participantes enviam palpites** no grupo
4. **Bot confirma** cada palpite registrado
5. **Admin cadastra resultados** no painel web
6. **Sistema calcula pontos** automaticamente
7. **Participantes consultam ranking** (`!ranking`)

## 📄 Licença

MIT
