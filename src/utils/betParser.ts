import { findTeamName, findClosestTeam } from "./teams";

interface Match {
  id: string;
  number: number; // Número do jogo na rodada (1, 2, 3...)
  homeTeam: string;
  awayTeam: string;
}

interface ParsedBet {
  matchId: string;
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  confidence: "high" | "medium" | "low";
  originalText: string;
}

interface ParseResult {
  success: boolean;
  bets: ParsedBet[];
  errors: string[];
  suggestions: string[];
}

/**
 * Parser inteligente de palpites que aceita múltiplos formatos
 *
 * Formatos aceitos:
 * - Numerado: "1) 2x1" ou "1- 2x1" ou "1. 2x1" ou "1: 2x1"
 * - Com times: "Flamengo 2 x 1 Vasco" ou "fla 2x1 vas"
 * - Misto: "1) Flamengo 2x1"
 * - Múltiplas linhas ou tudo em uma linha
 * - Separadores: "x", "X", "-", " a "
 */
export function parseBets(message: string, roundMatches: Match[]): ParseResult {
  const result: ParseResult = {
    success: false,
    bets: [],
    errors: [],
    suggestions: [],
  };

  // Normaliza a mensagem
  const normalizedMessage = message
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Tenta diferentes estratégias de parsing
  const strategies = [
    parseNumberedFormat,
    parseTeamNameFormat,
    parseMixedFormat,
    parseCompactFormat,
  ];

  for (const strategy of strategies) {
    const parsed = strategy(normalizedMessage, roundMatches);
    if (parsed.bets.length > 0) {
      result.bets.push(...parsed.bets);
      result.errors.push(...parsed.errors);
    }
  }

  // Remove duplicatas (mesmo jogo)
  const uniqueBets = new Map<string, ParsedBet>();
  for (const bet of result.bets) {
    const existing = uniqueBets.get(bet.matchId);
    // Mantém o de maior confiança
    if (
      !existing ||
      confidenceLevel(bet.confidence) > confidenceLevel(existing.confidence)
    ) {
      uniqueBets.set(bet.matchId, bet);
    }
  }
  result.bets = Array.from(uniqueBets.values());

  // Verifica jogos faltando
  const betMatchIds = new Set(result.bets.map((b) => b.matchId));
  const missingMatches = roundMatches.filter((m) => !betMatchIds.has(m.id));

  if (missingMatches.length > 0 && result.bets.length > 0) {
    result.suggestions.push(
      `Faltou palpite para: ${missingMatches.map((m) => `${m.number}) ${m.homeTeam} x ${m.awayTeam}`).join(", ")}`,
    );
  }

  result.success = result.bets.length > 0;

  return result;
}

function confidenceLevel(conf: string): number {
  return conf === "high" ? 3 : conf === "medium" ? 2 : 1;
}

/**
 * Formato: "1) 2x1" ou "1- 2x1" ou "1. 2x1"
 */
function parseNumberedFormat(
  message: string,
  matches: Match[],
): { bets: ParsedBet[]; errors: string[] } {
  const bets: ParsedBet[] = [];
  const errors: string[] = [];

  // Regex para capturar: número + separador + placar
  // Exemplos: "1) 2x1", "1- 2x1", "1. 2x1", "1: 2-1", "1 2x1"
  const patterns = [
    /(\d+)\s*[\)\-\.\:]\s*(\d+)\s*[xX\-aA]\s*(\d+)/g,
    /(\d+)\s+(\d+)\s*[xX\-]\s*(\d+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const matchNumber = parseInt(match[1]);
      const homeScore = parseInt(match[2]);
      const awayScore = parseInt(match[3]);

      const roundMatch = matches.find((m) => m.number === matchNumber);
      if (roundMatch) {
        bets.push({
          matchId: roundMatch.id,
          matchNumber: matchNumber,
          homeTeam: roundMatch.homeTeam,
          awayTeam: roundMatch.awayTeam,
          homeScore,
          awayScore,
          confidence: "high",
          originalText: match[0],
        });
      } else if (matchNumber <= 10) {
        // Provavelmente é um número de jogo
        errors.push(`Jogo ${matchNumber} não encontrado na rodada`);
      }
    }
  }

  return { bets, errors };
}

/**
 * Formato: "Flamengo 2 x 1 Vasco" ou "fla 2x1 vas"
 */
function parseTeamNameFormat(
  message: string,
  matches: Match[],
): { bets: ParsedBet[]; errors: string[] } {
  const bets: ParsedBet[] = [];
  const errors: string[] = [];

  // Regex para capturar: time1 + placar + time2
  // Aceita variações de espaço e separadores
  const pattern =
    /([a-záàâãéèêíïóôõöúçñ\-]+)\s*(\d+)\s*[xX\-aA]\s*(\d+)\s*([a-záàâãéèêíïóôõöúçñ\-]+)/gi;

  let match;
  while ((match = pattern.exec(message)) !== null) {
    const team1Text = match[1].trim();
    const homeScore = parseInt(match[2]);
    const awayScore = parseInt(match[3]);
    const team2Text = match[4].trim();

    // Tenta encontrar os times
    const team1 = findTeamName(team1Text) || findClosestTeam(team1Text);
    const team2 = findTeamName(team2Text) || findClosestTeam(team2Text);

    if (team1 && team2) {
      // Procura o jogo correspondente (pode estar em qualquer ordem)
      const roundMatch = matches.find(
        (m) =>
          (m.homeTeam === team1 && m.awayTeam === team2) ||
          (m.homeTeam === team2 && m.awayTeam === team1),
      );

      if (roundMatch) {
        // Verifica se a ordem está correta
        const isReversed = roundMatch.homeTeam === team2;

        bets.push({
          matchId: roundMatch.id,
          matchNumber: roundMatch.number,
          homeTeam: roundMatch.homeTeam,
          awayTeam: roundMatch.awayTeam,
          homeScore: isReversed ? awayScore : homeScore,
          awayScore: isReversed ? homeScore : awayScore,
          confidence:
            findTeamName(team1Text) && findTeamName(team2Text)
              ? "high"
              : "medium",
          originalText: match[0],
        });
      }
    }
  }

  return { bets, errors };
}

/**
 * Formato misto: "1) Flamengo 2x1" ou "1- fla 2x0 vas"
 */
function parseMixedFormat(
  message: string,
  matches: Match[],
): { bets: ParsedBet[]; errors: string[] } {
  const bets: ParsedBet[] = [];
  const errors: string[] = [];

  // Regex para número + opcionalmente time + placar + opcionalmente time
  const pattern =
    /(\d+)\s*[\)\-\.\:]\s*(?:([a-záàâãéèêíïóôõöúçñ\-]+)\s+)?(\d+)\s*[xX\-]\s*(\d+)(?:\s+([a-záàâãéèêíïóôõöúçñ\-]+))?/gi;

  let match;
  while ((match = pattern.exec(message)) !== null) {
    const matchNumber = parseInt(match[1]);
    const homeScore = parseInt(match[3]);
    const awayScore = parseInt(match[4]);

    const roundMatch = matches.find((m) => m.number === matchNumber);
    if (roundMatch) {
      bets.push({
        matchId: roundMatch.id,
        matchNumber: matchNumber,
        homeTeam: roundMatch.homeTeam,
        awayTeam: roundMatch.awayTeam,
        homeScore,
        awayScore,
        confidence: "high",
        originalText: match[0],
      });
    }
  }

  return { bets, errors };
}

/**
 * Formato compacto: múltiplos placares separados por vírgula ou espaço
 * Exemplo: "2x1, 0x0, 1x1" ou "2x1 0x0 1x1"
 */
function parseCompactFormat(
  message: string,
  matches: Match[],
): { bets: ParsedBet[]; errors: string[] } {
  const bets: ParsedBet[] = [];
  const errors: string[] = [];

  // Extrai todos os placares
  const scorePattern = /(\d+)\s*[xX\-]\s*(\d+)/g;
  const scores: { home: number; away: number; original: string }[] = [];

  let match;
  while ((match = scorePattern.exec(message)) !== null) {
    scores.push({
      home: parseInt(match[1]),
      away: parseInt(match[2]),
      original: match[0],
    });
  }

  // Se o número de placares bate com o número de jogos, assume ordem sequencial
  if (scores.length === matches.length) {
    for (let i = 0; i < scores.length; i++) {
      bets.push({
        matchId: matches[i].id,
        matchNumber: matches[i].number,
        homeTeam: matches[i].homeTeam,
        awayTeam: matches[i].awayTeam,
        homeScore: scores[i].home,
        awayScore: scores[i].away,
        confidence: "medium", // Médio porque assume ordem
        originalText: scores[i].original,
      });
    }
  }

  return { bets, errors };
}

/**
 * Formata os palpites parseados para confirmação
 */
export function formatParsedBets(bets: ParsedBet[]): string {
  if (bets.length === 0) {
    return "❌ Não consegui identificar seus palpites. Tente no formato:\n1) 2x1\n2) 0x0\n3) 1x1";
  }

  const lines = bets
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .map((bet) => {
      const conf =
        bet.confidence === "high"
          ? "✅"
          : bet.confidence === "medium"
            ? "⚠️"
            : "❓";
      return `${conf} ${bet.matchNumber}) ${bet.homeTeam} ${bet.homeScore} x ${bet.awayScore} ${bet.awayTeam}`;
    });

  return lines.join("\n");
}

// Exporta para testes
export {
  parseNumberedFormat,
  parseTeamNameFormat,
  parseMixedFormat,
  parseCompactFormat,
};
