# 🤖 CHUTAÍ - Guia Completo para Produção

## 📋 Visão Geral

O **Chutaí** é um bot completo de bolão do Brasileirão 2026 integrado ao WhatsApp. Ele gerencia automaticamente palpites, notificações, resultados e rankings de forma totalmente automatizada.

---

## 🚀 Como Iniciar o Bot em Produção

### 1. Iniciar o Bot do WhatsApp

```bash
npm run bot
```

**O que acontece:**

- Bot se conecta ao WhatsApp via Baileys
- Exibe QR Code para escanear (apenas na primeira vez)
- Carrega configuração do grupo
- Ativa todos os schedulers automáticos
- Começa a monitorar mensagens

### 2. Iniciar o Painel Admin (Opcional)

```bash
npm run admin
```

Acesse: http://localhost:3334

**Funcionalidades do painel:**

- Cadastrar jogos manualmente
- Lançar resultados
- Visualizar apostas
- Ver estatísticas

---

## ⚙️ Configuração Inicial (Primeira Vez)

### 1. Configurar o Grupo do Bolão

**No grupo do WhatsApp, envie:**

```
!setupgrupo
```

**Resposta do bot:**

```
✅ Este grupo foi configurado como o grupo do bolão!

Use !config para ver as regras e funcionamento.
```

⚠️ **IMPORTANTE:** Este comando precisa ser executado apenas UMA VEZ no grupo oficial.

### 2. Sincronizar Primeira Rodada

**Para buscar a próxima rodada automaticamente:**

```
!proxima
```

**Resposta do bot:**

```
🔄 Buscando próxima rodada...

✅ Rodada 2 detectada e sincronizada!

📊 10 jogos cadastrados
✏️ 0 atualizados

🎯 Use !jogos para ver os jogos
```

---

## 🔄 Sincronização Automática - Você NÃO Precisa Fazer Nada!

### ✅ O Bot Funciona 100% Automaticamente

Depois da configuração inicial, o bot faz **TUDO sozinho**:

#### 📅 Jogos do Dia (Automático às 06:00)

- Bot busca jogos do dia no SofaScore
- Atualiza horários automaticamente
- Cadastra novos jogos se houver

#### 🆕 Detecção de Nova Rodada (Automático às 02:00 toda segunda-feira)

- Bot detecta automaticamente quando há nova rodada disponível
- Cadastra todos os jogos da rodada
- Notifica o grupo automaticamente

#### ⏰ Verificação de Adiamentos (Automático às 10:00)

- Bot verifica se algum jogo foi adiado ou remarcado
- Atualiza status automaticamente
- Notifica o grupo sobre mudanças

#### 🔴 Resultados ao Vivo (Automático a cada 2 minutos)

- Bot monitora jogos ao vivo
- Atualiza placares automaticamente
- Notifica gols no grupo
- Calcula pontos quando o jogo termina

### 🎯 Resumo: O Que Você NÃO Precisa Fazer

❌ **NÃO precisa** buscar jogos manualmente  
❌ **NÃO precisa** verificar adiamentos  
❌ **NÃO precisa** lançar resultados  
❌ **NÃO precisa** calcular pontos  
❌ **NÃO precisa** enviar notificações

**Tudo é automático! Apenas deixe o bot rodando com `npm run bot` 🤖**

### 📝 Comandos Manuais (Opcionais)

Se quiser forçar algo manualmente, pode usar:

**Para buscar a próxima rodada manualmente:**

```
!proxima
```

**Resposta do bot:**

```
🔄 Buscando próxima rodada...

✅ Rodada 2 detectada e sincronizada!

📊 10 jogos cadastrados
✏️ 0 atualizados

🎯 Use !jogos para ver os jogos
```

**Ou sincronizar rodada específica:**

```
!syncrodada 3
```

---

## 🤖 Funcionamento Automático do Bot

### 🔄 Schedulers Ativos

O bot roda **24/7** com os seguintes schedulers automáticos:

#### 1. **Notificação Matinal (08:00)**

Envia jogos do dia automaticamente

#### 2. **Lembretes Periódicos (08h, 11h, 14h, 17h, 20h)**

Lembra quem ainda não palpitou

#### 3. **Última Chamada (1h antes do jogo)**

Lembrete urgente antes do primeiro jogo

#### 4. **Sincronização Diária (06:00)**

Busca jogos do dia no SofaScore

#### 5. **Nova Rodada (Segunda 02:00)**

Detecta automaticamente quando há nova rodada disponível

#### 6. **Verificação de Adiamentos (10:00)**

Checa se algum jogo foi adiado ou remarcado

#### 7. **Atualização em Tempo Real (a cada 2 minutos)**

- Monitora jogos ao vivo
- Notifica gols
- Atualiza placares
- Calcula pontos quando o jogo termina

---

## 📱 Exemplos de Mensagens Automáticas

### 1. 🌅 Bom Dia (08:00)

```
☀️ *BOM DIA, BOLEIROS!*

⚽ *JOGOS DE HOJE - RODADA 2*

🏟️ Flamengo x Vasco da Gama (16h00)
🏟️ Palmeiras x Corinthians (18h30)
🏟️ São Paulo x Santos (20h00)

📝 *Enviem seus palpites!*
_Lembrando: palpite só vale se enviado ANTES do jogo começar!_

⚠️ *ATENÇÃO: Uma vez enviado, o palpite NÃO PODE ser alterado!*
_Confira bem antes de enviar._

*Exemplo de palpite:*
Flamengo 2 x 1 Vasco da Gama
Palmeiras 3 x 0 Corinthians
São Paulo 1 x 2 Santos

💡 _Copie, altere os placares e envie aqui!_
```

### 2. ⏰ Lembrete Periódico (11h, 14h, 17h, 20h)

```
⏰ *LEMBRETE DE PALPITES*

🏟️ Próximo jogo em ~5h:
Flamengo x Vasco da Gama

📋 *Ainda faltam palpitar:*
• João Silva
• Maria Costa
• Pedro Santos

📝 _Enviem seus palpites!_
⚠️ _Lembre-se: palpites não podem ser alterados depois de enviados._
```

### 3. 🚨 Última Chamada (1h antes)

```
🚨 *ÚLTIMA CHAMADA!* 🚨

⏰ Falta *1 HORA* para começar:
🏟️ Flamengo x Vasco da Gama

📋 *Ainda faltam palpitar:*
• João Silva
• Pedro Santos

⚠️ _Corram que ainda dá tempo!_
⚠️ _Lembre-se: depois de enviado, não é possível alterar!_
```

### 4. ⚽ Gol ao Vivo

```
⚽ *GOOOOL!*

🏟️ Flamengo *1* x *0* Vasco da Gama

_Jogo ao vivo - Rodada 2_
```

### 5. 🏁 Fim de Jogo

```
🏁 *FIM DE JOGO!*

🏟️ Flamengo *2* x *1* Vasco da Gama

📊 *Pontuação neste jogo:*

🎯 *Placar exato (2pts):*
• João Silva
• Carlos Mendes

✅ *Resultado certo (1pt):*
• Maria Costa
• Ana Paula
• Roberto Lima

❌ *Erraram:*
• Pedro Santos
• Lucas Alves

_Digite !rodada para ver a parcial da rodada 2_
```

### 6. 🆕 Nova Rodada Detectada

```
🆕 *NOVA RODADA DISPONÍVEL!*

⚽ *RODADA 3*
📅 Começa dia 08/02 às 16h00

🎯 10 jogos cadastrados

_Digite !jogos para ver todos os jogos_
```

### 7. ⚠️ Jogo Adiado

```
⚠️ *JOGO ADIADO*

🏟️ *Flamengo x Vasco da Gama*
📅 Rodada 2
🕐 Horário original: 08/02 às 16h00

_O jogo foi adiado. As apostas continuam válidas e serão contabilizadas quando o jogo for remarcado._
```

### 8. ✅ Jogo Remarcado

```
✅ *JOGO REMARCADO*

🏟️ *Flamengo x Vasco da Gama*
📅 Rodada 2

🕐 *Novo horário:* 15/02 às 20h00
🕐 Horário antigo: 08/02 às 16h00

_Apostas antigas continuam válidas. Você pode enviar novos palpites até o novo horário!_
```

---

## 📝 Como Palpitar

### Formato Básico

Envie todos os palpites de uma vez, no formato:

```
Time Casa X x Y Time Fora
```

### Exemplos de Palpites Aceitos

**✅ Formato completo:**

```
Flamengo 2 x 1 Vasco da Gama
Palmeiras 3 x 0 Corinthians
São Paulo 1 x 1 Santos
```

**✅ Formato com abreviações:**

```
Flamengo 2x1 Vasco
Palmeiras 3x0 Corinthians
São Paulo 1x1 Santos
```

**✅ Formato numerado:**

```
1) 2x1
2) 3x0
3) 1x1
```

**✅ Palpitar em nome de outra pessoa:**

```
JOÃO SILVA
Flamengo 2x1 Vasco
Palmeiras 3x0 Corinthians
```

⚠️ **IMPORTANTE - Consistência de Nomes:**

Quando palpitar em nome de outra pessoa, **sempre use o MESMO nome** para aquela pessoa em todos os palpites futuros.

✅ **BOA NOTÍCIA:** O bot ignora maiúsculas/minúsculas! "NEI", "Nei" e "nei" são reconhecidos como o mesmo jogador!

**❌ ERRADO - Cria jogadores duplicados:**

```
Rodada 1: "NEI" → Cria jogador "NEI"
Rodada 2: "CLAUDINEI" → Cria jogador "CLAUDINEI" (outro jogador!)
Rodada 3: "CLAUDINHO" → Cria jogador "CLAUDINHO" (outro jogador!)
```

**✅ CORRETO - Mantém o mesmo jogador:**

```
Rodada 1: "NEI" → Cria jogador "NEI"
Rodada 2: "Nei" → Usa o mesmo jogador "NEI" ✓ (maiúsculas ignoradas)
Rodada 3: "nei" → Usa o mesmo jogador "NEI" ✓ (maiúsculas ignoradas)
```

**Dica:** Escolha um apelido/nome fixo e use sempre. Variações de capitalização (NEI/Nei/nei) são aceitas! Exemplos: "NEI", "JOÃO", "ZECA"

### Confirmação de Palpite

```
✅ *Palpites de João Silva registrados!*

1️⃣ Flamengo 2x1 Vasco da Gama
2️⃣ Palmeiras 3x0 Corinthians
3️⃣ São Paulo 1x1 Santos

⚠️ *ATENÇÃO: Palpites não podem ser alterados!*
```

### Tentativa de Alterar Palpite

```
🚫 *Palpites já registrados (não alterados):*
1) Flamengo x Vasco da Gama (já palpitado: 2x1)
2) Palmeiras x Corinthians (já palpitado: 3x0)

_Palpites são definitivos e não podem ser modificados._
```

---

## 🎮 Comandos Disponíveis

### 📋 Comandos de Palpites e Jogos

#### `!jogos`

Mostra jogos da rodada atual

**Resposta:**

```
⚽ *RODADA 2 - BRASILEIRÃO 2026*

📅 *Sábado, 08/02*
1️⃣ Flamengo x Vasco da Gama (16h00)
2️⃣ Palmeiras x Corinthians (18h30)

📅 *Domingo, 09/02*
3️⃣ São Paulo x Santos (20h00)

---
📝 *Como palpitar:*
Envie todos os palpites de uma vez só!

*Exemplo:*
Flamengo 2 x 1 Vasco da Gama
Palmeiras 3 x 0 Corinthians
São Paulo 1 x 0 Santos

💡 _Copie, altere os placares e envie!_
```

#### `!palpites`

Ver todos os palpites da rodada

**Resposta:**

```
📋 *PALPITES DA RODADA*

*Flamengo x Vasco da Gama*
  • João Silva: 2x1
  • Maria Costa: 3x0
  • Pedro Santos: 1x1

*Palmeiras x Corinthians*
  • João Silva: 3x0
  • Maria Costa: 2x0
```

#### `!meus` ou `!meuspalpites`

Ver seus próprios palpites

**Resposta:**

```
📝 *Seus últimos palpites, João Silva:*

• Flamengo 2x1 Vasco da Gama → 2pts
• Palmeiras 3x0 Corinthians → 1pt
• São Paulo 1x1 Santos → 0pts
```

#### `!faltam` ou `!pendentes`

Ver quem ainda não palpitou

**Resposta:**

```
⏳ *AINDA FALTAM PALPITAR:*

• Pedro Santos
• Lucas Alves
• Ana Paula

📝 Enviem seus palpites, galera!
```

---

### 🏆 Comandos de Rankings

#### `!ranking` ou `!classificacao`

Ranking geral do bolão

**Resposta:**

```
🏆 *RANKING DO BOLÃO*

🥇 *João Silva*
   15 pts | 10 jogos | 4 cravadas

🥈 *Maria Costa*
   12 pts | 10 jogos | 3 cravadas

🥉 *Pedro Santos*
   11 pts | 10 jogos | 2 cravadas

4. *Carlos Mendes*
   10 pts | 9 jogos | 2 cravadas
```

#### `!ranking X`

Ranking de rodada específica

**Exemplo:** `!ranking 2`

**Resposta:**

```
🏆 *RANKING RODADA 2* (✅ ENCERRADA)

🥇 *João Silva*
   8 pts | 4 cravadas

🥈 *Maria Costa*
   6 pts | 2 cravadas

🥉 *Pedro Santos*
   5 pts | 1 cravadas
```

#### `!rodada` ou `!rodada X`

Status e parcial da rodada atual/específica

**Resposta:**

```
⚽ *RODADA 2 - PARCIAL*
📊 6/10 jogos finalizados

*Resultados:*
✅ Flamengo 2 x 1 Vasco da Gama
✅ Palmeiras 3 x 0 Corinthians
✅ São Paulo 1 x 1 Santos

*Ainda vão jogar:*
⏳ Grêmio x Internacional (08/02 18h00)
⏳ Cruzeiro x Atlético-MG (08/02 20h00)

*Ranking parcial:*
🥇 João Silva: 8 pts (+4 jogos)
🥈 Maria Costa: 6 pts (+4 jogos)
🥉 Pedro Santos: 5 pts (+4 jogos)
```

---

### 🔄 Comandos de Sincronização

#### `!sync` ou `!sincronizar`

Força sincronização dos jogos de hoje

**Resposta:**

```
🔄 Sincronizando jogos do Brasileirão...

✅ Sincronização completa!

📊 3 jogos novos
✏️ 2 atualizados
```

#### `!syncrodada X`

Sincroniza rodada específica

**Exemplo:** `!syncrodada 3`

**Resposta:**

```
🔄 Sincronizando rodada 3...

✅ Rodada 3 sincronizada!

📊 10 jogos novos
✏️ 0 atualizados
```

#### `!proxima` ou `!proximarodada`

Busca e cadastra próxima rodada automaticamente

**Resposta:**

```
🔄 Buscando próxima rodada...

✅ Rodada 3 detectada e sincronizada!

📊 10 jogos cadastrados
✏️ 0 atualizados

🎯 Use !jogos para ver os jogos
```

#### `!verificar` ou `!verificaradiados`

Verifica jogos adiados/remarcados

**Resposta:**

```
🔍 Verificando jogos adiados e remarcados...

📊 Verificação concluída!

⚠️ 1 jogo(s) adiado(s)/cancelado(s)
✅ 2 jogo(s) remarcado(s)
```

---

### ℹ️ Comandos de Informação

#### `!config` ou `!regras` ou `!info`

Mostra regras e funcionamento completo

**Resposta:**

```
🤖 *CHUTAÍ - BOT DO BOLÃO BRASILEIRÃO 2026*

━━━━━━━━━━━━━━━━━━━━

📋 *REGRAS DO BOLÃO*

✅ *Pontuação:*
• Placar EXATO: *2 pontos*
• Vencedor/Empate CERTO: *1 ponto*
• Placar ERRADO: *0 pontos*

🚫 *ATENÇÃO - Palpites IMUTÁVEIS:*
• Uma vez enviado, o palpite *NÃO PODE* ser alterado
• Confira bem antes de enviar!
• Tentativas de enviar novamente serão rejeitadas

⏰ *Prazo para Palpitar:*
• Palpites só valem se enviados *ANTES* do jogo começar
• Após o início, o jogo não aceita mais palpites

━━━━━━━━━━━━━━━━━━━━

🤖 *FUNCIONAMENTO DO BOT*

📍 *Notificações Automáticas:*
• 08h - Bom dia com jogos do dia
• 08h/11h/14h/17h/20h - Lembretes periódicos
• 1h antes - Última chamada!

⚽ *Atualizações em Tempo Real:*
• Gols são notificados automaticamente
• Resultados atualizados a cada 2 minutos
• Pontuação calculada ao final de cada jogo

📊 *Sincronização com SofaScore:*
• 06h - Sincroniza jogos do dia
• 10h - Verifica jogos adiados/remarcados
• Segunda 02h - Detecta nova rodada

━━━━━━━━━━━━━━━━━━━━

📝 *COMO PALPITAR*

Envie seus palpites no formato:
`Time Casa X x Y Time Fora`

*Exemplo:*
Flamengo 2x1 Vasco
Palmeiras 3x0 Corinthians
São Paulo 1x1 Santos

💡 *Dica:* Envie todos os palpites de uma vez!

━━━━━━━━━━━━━━━━━━━━

⚙️ *COMANDOS DISPONÍVEIS*

Use *!ajuda* para ver lista completa de comandos

━━━━━━━━━━━━━━━━━━━━

🎯 *BOA SORTE E BONS PALPITES!* ⚽
```

#### `!ajuda` ou `!help` ou `!comandos`

Lista completa de comandos

**Resposta:**

```
🤖 *COMANDOS DO CHUTAÍ*

*📋 Palpites e Jogos:*
*!jogos* - Ver jogos da rodada
*!palpites* - Ver todos os palpites
*!meus* - Ver seus palpites
*!faltam* - Ver quem falta palpitar

*🏆 Rankings:*
*!ranking* - Ranking geral do bolão
*!ranking X* - Ranking da rodada X
*!rodada* - Status e parcial da rodada atual

*🔄 Sincronização:*
*!sync* - Sincroniza jogos de hoje
*!syncrodada X* - Sincroniza rodada X
*!proxima* - Busca e cadastra próxima rodada
*!verificar* - Verifica jogos adiados/remarcados

*📝 Para palpitar:*
Envie todos os palpites de uma vez!
Ex: `Flamengo 2x1 Vasco`

*👥 Palpitar em nome de outra pessoa:*
NOME DA PESSOA
Flamengo 2x1 Vasco
```

---

## 🎯 Sistema de Pontuação

### Como Funciona

| Situação             | Pontos   | Exemplo                                                 |
| -------------------- | -------- | ------------------------------------------------------- |
| **Placar Exato**     | 2 pontos | Jogo: 2x1 → Palpite: 2x1 ✅                             |
| **Resultado Certo**  | 1 ponto  | Jogo: 2x1 → Palpite: 3x0 ✅ (ambos vitória do mandante) |
| **Resultado Errado** | 0 pontos | Jogo: 2x1 → Palpite: 0x0 ❌                             |

### Exemplos Detalhados

**Jogo Real:** Flamengo 2 x 1 Vasco

| Palpite | Resultado | Pontos    | Motivo                            |
| ------- | --------- | --------- | --------------------------------- |
| 2x1     | ✅        | **2 pts** | Placar exato!                     |
| 3x0     | ✅        | **1 pt**  | Acertou vitória do Flamengo       |
| 1x0     | ✅        | **1 pt**  | Acertou vitória do Flamengo       |
| 1x1     | ❌        | **0 pts** | Errou (palpitou empate)           |
| 0x2     | ❌        | **0 pts** | Errou (palpitou vitória do Vasco) |

---

## ⚠️ Regras Importantes

### 1. 🚫 Palpites São IMUTÁVEIS

- **Uma vez enviado, NÃO PODE ser alterado**
- Não existe edição ou correção
- Confira bem antes de enviar
- Tentativas de reenvio serão rejeitadas

### 2. ⏰ Prazo para Palpitar

- Palpites só valem **ANTES** do jogo começar
- Após o horário de início, o bot rejeita automaticamente
- Mesmo que o jogo atrase, o horário oficial é o limite

### 3. � Consistência de Nomes (MUITO IMPORTANTE!)

Quando palpitar em nome de outra pessoa, **SEMPRE use o MESMO nome**:

✅ **BOA NOTÍCIA:** O bot ignora maiúsculas/minúsculas! "NEI", "Nei" e "nei" são o mesmo jogador.

**❌ ERRADO - Cria jogadores diferentes:**

```
Rodada 1: "NEI"
Rodada 2: "CLAUDINEI"  ← Bot cria outro jogador!
Rodada 3: "CLAUDINHO"  ← Bot cria mais um jogador!
```

Resultado: 3 jogadores diferentes no ranking (NEI, CLAUDINEI, CLAUDINHO)

**✅ CORRETO - Mantém o mesmo jogador:**

```
Rodada 1: "NEI"
Rodada 2: "Nei"  ← Mesmo jogador ✓ (maiúsculas ignoradas)
Rodada 3: "nei"  ← Mesmo jogador ✓ (maiúsculas ignoradas)
```

Resultado: 1 único jogador com todos os pontos acumulados

**💡 Dica prática:**

- Escolha um apelido curto e fixo para cada pessoa
- Anote os nomes usados (NEI, JOÃO, ZECA, etc.)
- Use sempre os mesmos nomes em todas as rodadas
- Variações de maiúsculas são OK! (NEI = Nei = nei)
- Evite apelidos diferentes (NEI ≠ CLAUDINEI ≠ CLAUDINHO)

### 4. 📅 Jogos Adiados

- Se um jogo é **adiado**, as apostas são **mantidas**
- Quando remarcado, apostas antigas continuam válidas
- Você pode fazer **novos palpites** até o novo horário

### 5. ❌ Jogos Cancelados

- Se um jogo é **cancelado**, todas as apostas são **removidas**
- O jogo não conta para pontuação

---

## 🔧 Detalhes Técnicos para o Administrador

### Arquivos de Autenticação

O bot armazena a sessão do WhatsApp em:

```
auth_info_baileys/
```

⚠️ **IMPORTANTE:**

- Faça backup desta pasta regularmente
- Se perder estes arquivos, precisará escanear o QR Code novamente
- Não compartilhe estes arquivos (contêm credenciais)

### Banco de Dados

**Conexão:** PostgreSQL no Neon Cloud
**Schema:** Gerenciado pelo Prisma

**Modelos:**

- `Player` - Jogadores do bolão
- `Group` - Grupos do WhatsApp
- `Match` - Jogos do campeonato
- `Bet` - Palpites dos jogadores
- `Notification` - Histórico de notificações

### Logs do Bot

O bot exibe logs em tempo real:

```
✅ Bot conectado ao WhatsApp!
📍 Grupo configurado: 5511999999999@g.us
🔄 Sincronizando jogos do Brasileirão...
📩 Mensagem de 5511888888888: Flamengo 2x1...
✅ Palpite registrado: João Silva
```

### Monitoramento

**Sinais de que está funcionando:**

- ✅ "Bot conectado ao WhatsApp!" aparece
- ✅ Schedulers são listados no início
- ✅ Mensagens são processadas em tempo real
- ✅ Notificações saem nos horários programados

**Problemas comuns:**

- ❌ "Conexão fechada" → Bot foi desconectado, reinicie
- ❌ "Erro ao sincronizar" → SofaScore pode estar bloqueando, tente depois
- ❌ "Banco de dados inacessível" → Verifique DATABASE_URL no .env

---

## 🎬 Fluxo de Uso Típico

### Início da Rodada (Segunda-feira 02:00)

1. 🤖 Bot detecta automaticamente nova rodada
2. 📊 Sincroniza todos os jogos
3. 📢 Notifica o grupo que nova rodada está disponível

### Dia do Jogo (08:00)

1. ☀️ Bot envia "Bom dia" com jogos de hoje
2. 📝 Jogadores enviam palpites ao longo do dia
3. ✅ Bot confirma cada palpite individualmente

### Antes do Jogo (1h antes)

1. 🚨 Bot envia última chamada
2. ⏰ Lista quem ainda não palpitou

### Durante o Jogo

1. 🔴 Bot monitora ao vivo
2. ⚽ Notifica cada gol
3. 📊 Atualiza placar a cada 2 minutos

### Após o Jogo

1. 🏁 Bot envia resultado final
2. 🎯 Mostra quem acertou/errou
3. 📊 Calcula pontos automaticamente
4. 🏆 Ranking é atualizado

---

## 📊 Estatísticas e Métricas

O bot mantém automaticamente:

- **Ranking Geral** - Pontuação acumulada de todo o campeonato
- **Ranking por Rodada** - Pontuação específica de cada rodada
- **Placares Exatos** - Quantas vezes cada jogador cravou
- **Taxa de Acerto** - Quantos jogos pontuou vs total de jogos
- **Histórico Completo** - Todos os palpites de cada jogador

---

## 🛡️ Segurança e Boas Práticas

### ✅ O que o bot FAZ automaticamente

- Valida horários dos jogos
- Impede alteração de palpites
- Rejeita palpites após o início do jogo
- Calcula pontos corretamente
- Mantém histórico completo
- Notifica mudanças de status

### ❌ O que o bot NÃO FAZ

- Não aceita palpites por mensagem privada (só no grupo)
- Não permite edição de palpites
- Não aceita palpites após o horário do jogo
- Não processa comandos de usuários bloqueados

---

## 💡 Dicas para os Jogadores

1. **Envie todos os palpites de uma vez** - Não precisa esperar
2. **Copie o exemplo** - Bot mostra formato exato na mensagem !jogos
3. **Use abreviações** - "Fla 2x1 Vas" funciona perfeitamente
4. **Confira antes de enviar** - Palpites não podem ser alterados!
5. **Palpite com antecedência** - Não deixe para última hora
6. **Acompanhe o grupo** - Bot notifica tudo em tempo real
7. **🚨 IMPORTANTE - Ao palpitar por outra pessoa:** SEMPRE use o MESMO nome base (ex: "NEI", "Nei" ou "nei" são aceitos, mas evite "CLAUDINEI")

---

## 🆘 Suporte e Troubleshooting

### Bot não está respondendo

1. Verifique se o processo está rodando: `npm run bot`
2. Verifique conexão com banco de dados
3. Verifique se o WhatsApp não desconectou

### Comando não funciona

1. Verifique se está no grupo configurado
2. Comandos devem começar com `!`
3. Teste `!ajuda` para ver se bot responde

### Palpite não foi aceito

1. Verifique se o jogo já começou
2. Verifique formato do palpite
3. Tente `!jogos` para ver formato correto

---

## 📞 Suporte Técnico

Para problemas técnicos:

1. Verifique logs do bot no terminal
2. Tente reiniciar: `npm run bot`
3. Verifique conectividade com banco de dados
4. Confira arquivo `.env` está configurado corretamente

---

**🎉 O bot está pronto para produção!**

Boa sorte com o bolão! ⚽🏆
