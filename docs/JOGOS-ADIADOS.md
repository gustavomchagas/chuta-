# Sistema de Jogos Adiados/Cancelados - Documentação

## 📋 Visão Geral

Sistema implementado para detectar e gerenciar jogos do Brasileirão que foram adiados, cancelados ou remarcados pela CBF. O bot automaticamente notifica o grupo e ajusta as apostas conforme necessário.

## 🎯 Funcionalidades

### 1. Detecção de Status

- **POSTPONED**: Jogo adiado sem nova data definida
- **CANCELLED**: Jogo cancelado definitivamente pela CBF
- **SCHEDULED**: Jogo remarcado (volta de POSTPONED para SCHEDULED com nova data)

### 2. Ações Automáticas

#### Quando um jogo é ADIADO:

- ✅ Status no banco atualizado para `POSTPONED`
- ✅ Apostas mantidas (serão contabilizadas na nova data)
- ✅ Notificação enviada ao grupo com horário original
- ✅ Mensagem: "As apostas continuam válidas"

#### Quando um jogo é CANCELADO:

- ✅ Status no banco atualizado para `CANCELLED`
- ✅ **Todas as apostas são removidas** (jogo não aconteceu)
- ✅ Notificação enviada ao grupo
- ✅ Mensagem: "Apostas removidas e não serão contabilizadas"

#### Quando um jogo é REMARCADO:

- ✅ Status volta para `SCHEDULED`
- ✅ Nova data/hora atualizada no banco
- ✅ Apostas antigas **continuam válidas**
- ✅ Apostas novas permitidas até novo horário
- ✅ Notificação com horário antigo vs novo

## 🔧 Implementação Técnica

### Arquivos Modificados

#### 1. `sofascoreScraper.ts`

```typescript
// Interface expandida
export interface GameData {
  // ... campos existentes
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";
  isPostponed?: boolean;
  postponedReason?: string;
}

// Função de conversão de status
function convertStatus(statusCode: number) {
  if (statusCode === 100) return "FINISHED";
  if (statusCode === 70) return "POSTPONED"; // ⭐ NOVO
  if (statusCode === 80 || 90) return "CANCELLED"; // ⭐ NOVO
  if (statusCode >= 6 && statusCode <= 50) return "LIVE";
  return "SCHEDULED";
}
```

#### 2. `smartBot.ts`

```typescript
// Nova função de verificação
export async function checkPostponedGames(): Promise<{
  postponed: number;
  rescheduled: number;
}> {
  // 1. Busca jogos dos últimos 7 dias (não finalizados)
  // 2. Compara com SofaScore para detectar mudanças
  // 3. Atualiza banco e notifica grupo
  // 4. Remove apostas se CANCELADO
  // 5. Mantém apostas se ADIADO ou REMARCADO
}

// Scheduler adicionado (10h diariamente)
setInterval(async () => {
  const now = dayjs();
  if (now.hour() === 10 && now.minute() === 0) {
    await checkPostponedGames();
  }
}, 60000);
```

## 📱 Comandos

### Comando Manual

```
!verificar
!verificaradiados
```

**Função**: Força verificação imediata de jogos adiados/remarcados
**Retorno**: Relatório com quantidade de alterações detectadas

## ⏰ Schedulers

| Horário         | Frequência | Função                        |
| --------------- | ---------- | ----------------------------- |
| 06:00           | Diário     | Sincroniza jogos do dia       |
| 10:00           | Diário     | **Verifica jogos adiados** ⭐ |
| 02:00           | Segundas   | Detecta nova rodada           |
| Contínuo        | 2 min      | Atualiza resultados ao vivo   |
| 08/11/14/17/20h | Diário     | Lembretes de palpites         |

## 🧪 Testes

### Script de Teste: `test-postponed.ts`

```bash
npx tsx test-postponed.ts
```

**Validação**:

- ✅ Lista jogos SCHEDULED/POSTPONED/CANCELLED do banco
- ✅ Executa checkPostponedGames()
- ✅ Exibe relatório de alterações detectadas
- ✅ Confirma que notificações seriam enviadas

## 📊 Fluxo de Notificações

### Exemplo: Jogo Adiado

```
⚠️ *JOGO ADIADO*

🏟️ *Flamengo x Vasco*
📅 Rodada 5
🕐 Horário original: 15/02 às 19h00

_O jogo foi adiado. As apostas continuam válidas e serão
contabilizadas quando o jogo for remarcado._
```

### Exemplo: Jogo Remarcado

```
✅ *JOGO REMARCADO*

🏟️ *Flamengo x Vasco*
📅 Rodada 5

🕐 *Novo horário:* 20/02 às 21h30
🕐 Horário antigo: 15/02 às 19h00

_Apostas antigas continuam válidas. Você pode enviar novos
palpites até o novo horário!_
```

### Exemplo: Jogo Cancelado

```
❌ *JOGO CANCELADO*

🏟️ *Flamengo x Vasco*
📅 Rodada 5

_O jogo foi cancelado pela CBF. As apostas foram removidas
e não serão contabilizadas._
```

## 🔍 Códigos de Status SofaScore

| Código | Status    | Descrição       |
| ------ | --------- | --------------- |
| 0      | SCHEDULED | Jogo agendado   |
| 6-50   | LIVE      | Jogo ao vivo    |
| 70     | POSTPONED | Jogo adiado     |
| 80, 90 | CANCELLED | Jogo cancelado  |
| 100    | FINISHED  | Jogo finalizado |

## 🚀 Próximos Passos Sugeridos

1. **Histórico de Remarcações**: Salvar log de todas as mudanças de horário
2. **Múltiplas Remarcações**: Tratar caso onde jogo é remarcado várias vezes
3. **Filtro por Motivo**: Extrair motivo do adiamento se disponível no SofaScore
4. **Estatísticas**: "Jogo com mais remarcações da temporada"
5. **Notificação Prévia**: Avisar com antecedência se jogo corre risco de adiamento (chuva forte, etc.)

## ✅ Checklist de Implementação

- [x] Expandir enum MatchStatus (POSTPONED, CANCELLED)
- [x] Atualizar convertStatus() com novos códigos
- [x] Criar função checkPostponedGames()
- [x] Adicionar scheduler diário (10h)
- [x] Implementar comando !verificar
- [x] Atualizar mensagem de ajuda
- [x] Criar script de teste
- [x] Validar compilação TypeScript
- [x] Testar com dados reais do banco

## 🎯 Casos de Uso

### Caso 1: Chuva Forte em São Paulo

1. CBF adia Corinthians x Palmeiras de 10/02 para data a definir
2. Às 10h, bot detecta status POSTPONED
3. Grupo recebe notificação
4. Apostas ficam bloqueadas mas não são removidas
5. Quando CBF remarcar para 25/02, bot detecta e notifica
6. Apostas antigas continuam válidas, novas permitidas até 25/02

### Caso 2: Problema no Estádio

1. CBF cancela definitivamente Cruzeiro x Atlético-MG
2. Bot detecta status CANCELLED
3. Grupo é notificado
4. **Todas as apostas deste jogo são automaticamente removidas**
5. Pontos não são contabilizados

## 📝 Notas de Desenvolvimento

- **Janela de Verificação**: Últimos 7 dias (jogos muito antigos não são verificados)
- **Tolerância**: Diferença de 1 minuto na data é ignorada (evita falsos positivos)
- **Dependência**: Requer WhatsApp conectado para notificações
- **Performance**: Consulta SofaScore apenas para jogos não finalizados
- **Atomicidade**: Operações de banco são transacionais (update + delete de apostas)

---

**Última Atualização**: 01/02/2026  
**Versão**: 1.0  
**Status**: ✅ Implementado e Testado
