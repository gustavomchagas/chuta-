/**
 * Serviço para integração com SofaScore
 * Busca jogos e resultados do Brasileirão Série A em tempo real
 */

// ID do Brasileirão Série A no SofaScore
const BRASILEIRAO_TOURNAMENT_ID = 325;
const BRASILEIRAO_SEASON_ID = 58766; // 2026 - Atualizar conforme temporada

// Headers para simular navegador real
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Origin: "https://www.sofascore.com",
  Referer: "https://www.sofascore.com/",
  "Sec-Ch-Ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
};

// Mapeamento de nomes de times (SofaScore -> Nome padronizado)
const TEAM_NAME_MAP: Record<string, string> = {
  // Times da Série A 2026
  Flamengo: "Flamengo",
  Palmeiras: "Palmeiras",
  "São Paulo": "São Paulo",
  Corinthians: "Corinthians",
  Fluminense: "Fluminense",
  Botafogo: "Botafogo",
  "Vasco da Gama": "Vasco da Gama",
  Vasco: "Vasco da Gama",
  Grêmio: "Grêmio",
  Internacional: "Internacional",
  "Atlético Mineiro": "Atlético-MG",
  "Atlético-MG": "Atlético-MG",
  Cruzeiro: "Cruzeiro",
  "Athletico Paranaense": "Athletico-PR",
  "Athletico-PR": "Athletico-PR",
  Fortaleza: "Fortaleza",
  Bahia: "Bahia",
  "Red Bull Bragantino": "Bragantino",
  Bragantino: "Bragantino",
  Cuiabá: "Cuiabá",
  Santos: "Santos",
  Juventude: "Juventude",
  Vitória: "Vitória",
  Ceará: "Ceará",
  Sport: "Sport",
  Mirassol: "Mirassol",
  Goiás: "Goiás",
  Coritiba: "Coritiba",
  "América Mineiro": "América-MG",
  "América-MG": "América-MG",
};

interface SofaScoreEvent {
  id: number;
  tournament: {
    uniqueTournament: {
      id: number;
      name: string;
    };
  };
  season: {
    id: number;
  };
  roundInfo?: {
    round: number;
  };
  status: {
    code: number;
    description: string;
    type: string;
  };
  homeTeam: {
    name: string;
    shortName: string;
  };
  awayTeam: {
    name: string;
    shortName: string;
  };
  homeScore?: {
    current?: number;
    display?: number;
    period1?: number;
    period2?: number;
  };
  awayScore?: {
    current?: number;
    display?: number;
    period1?: number;
    period2?: number;
  };
  startTimestamp: number;
}

interface SofaScoreResponse {
  events: SofaScoreEvent[];
}

export interface GameData {
  sofascoreId: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  round: number;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
}

/**
 * Normaliza o nome do time para o padrão do sistema
 */
function normalizeTeamName(name: string): string {
  return TEAM_NAME_MAP[name] || name;
}

/**
 * Converte status do SofaScore para nosso sistema
 */
function convertStatus(statusCode: number): "SCHEDULED" | "LIVE" | "FINISHED" {
  // Status codes do SofaScore:
  // 0 = Not started
  // 6, 7 = 1st half, 2nd half (live)
  // 31 = Halftime
  // 100 = Finished
  // 60 = Postponed
  // 70 = Cancelled

  if (statusCode === 0 || statusCode === 60 || statusCode === 70) {
    return "SCHEDULED";
  } else if (statusCode === 100) {
    return "FINISHED";
  } else {
    return "LIVE";
  }
}

/**
 * Busca jogos do Brasileirão de uma data específica
 */
export async function fetchBrasileiraoGames(date: Date): Promise<GameData[]> {
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`;

  console.log(`🔍 Buscando jogos do dia ${dateStr}...`);

  try {
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SofaScoreResponse;

    // Filtra apenas jogos do Brasileirão Série A
    const brasileiraoGames = data.events.filter(
      (event) =>
        event.tournament?.uniqueTournament?.id === BRASILEIRAO_TOURNAMENT_ID,
    );

    console.log(
      `📋 Encontrados ${brasileiraoGames.length} jogos do Brasileirão`,
    );

    return brasileiraoGames.map((event) => ({
      sofascoreId: event.id,
      homeTeam: normalizeTeamName(event.homeTeam.name),
      awayTeam: normalizeTeamName(event.awayTeam.name),
      matchDate: new Date(event.startTimestamp * 1000),
      round: event.roundInfo?.round || 1,
      homeScore: event.homeScore?.current ?? null,
      awayScore: event.awayScore?.current ?? null,
      status: convertStatus(event.status.code),
    }));
  } catch (error) {
    console.error("❌ Erro ao buscar jogos do SofaScore:", error);
    return [];
  }
}

/**
 * Busca jogos ao vivo do Brasileirão
 */
export async function fetchLiveGames(): Promise<GameData[]> {
  const url = `https://api.sofascore.com/api/v1/sport/football/events/live`;

  try {
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SofaScoreResponse;

    // Filtra apenas jogos do Brasileirão Série A
    const brasileiraoGames = data.events.filter(
      (event) =>
        event.tournament?.uniqueTournament?.id === BRASILEIRAO_TOURNAMENT_ID,
    );

    return brasileiraoGames.map((event) => ({
      sofascoreId: event.id,
      homeTeam: normalizeTeamName(event.homeTeam.name),
      awayTeam: normalizeTeamName(event.awayTeam.name),
      matchDate: new Date(event.startTimestamp * 1000),
      round: event.roundInfo?.round || 1,
      homeScore: event.homeScore?.current ?? null,
      awayScore: event.awayScore?.current ?? null,
      status: convertStatus(event.status.code),
    }));
  } catch (error) {
    console.error("❌ Erro ao buscar jogos ao vivo:", error);
    return [];
  }
}

/**
 * Busca detalhes de um jogo específico
 */
export async function fetchGameDetails(
  eventId: number,
): Promise<GameData | null> {
  const url = `https://api.sofascore.com/api/v1/event/${eventId}`;

  try {
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { event: SofaScoreEvent };
    const event = data.event;

    return {
      sofascoreId: event.id,
      homeTeam: normalizeTeamName(event.homeTeam.name),
      awayTeam: normalizeTeamName(event.awayTeam.name),
      matchDate: new Date(event.startTimestamp * 1000),
      round: event.roundInfo?.round || 1,
      homeScore: event.homeScore?.current ?? null,
      awayScore: event.awayScore?.current ?? null,
      status: convertStatus(event.status.code),
    };
  } catch (error) {
    console.error(`❌ Erro ao buscar detalhes do jogo ${eventId}:`, error);
    return null;
  }
}

/**
 * Busca todos os jogos de uma rodada específica
 */
export async function fetchRoundGames(round: number): Promise<GameData[]> {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/${BRASILEIRAO_TOURNAMENT_ID}/season/${BRASILEIRAO_SEASON_ID}/events/round/${round}`;

  console.log(`🔍 Buscando jogos da rodada ${round}...`);

  try {
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SofaScoreResponse;

    console.log(
      `📋 Encontrados ${data.events.length} jogos na rodada ${round}`,
    );

    return data.events.map((event) => ({
      sofascoreId: event.id,
      homeTeam: normalizeTeamName(event.homeTeam.name),
      awayTeam: normalizeTeamName(event.awayTeam.name),
      matchDate: new Date(event.startTimestamp * 1000),
      round: event.roundInfo?.round || round,
      homeScore: event.homeScore?.current ?? null,
      awayScore: event.awayScore?.current ?? null,
      status: convertStatus(event.status.code),
    }));
  } catch (error) {
    console.error(`❌ Erro ao buscar jogos da rodada ${round}:`, error);
    return [];
  }
}

/**
 * Busca a rodada atual do Brasileirão
 */
export async function fetchCurrentRound(): Promise<number> {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/${BRASILEIRAO_TOURNAMENT_ID}/season/${BRASILEIRAO_SEASON_ID}/rounds`;

  try {
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { currentRound: { round: number } };

    return data.currentRound?.round || 1;
  } catch (error) {
    console.error("❌ Erro ao buscar rodada atual:", error);
    return 1;
  }
}

/**
 * Busca informações da temporada atual para obter o season ID correto
 */
export async function fetchCurrentSeasonId(): Promise<number | null> {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/${BRASILEIRAO_TOURNAMENT_ID}/seasons`;

  try {
    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      seasons: Array<{ id: number; year: string }>;
    };

    // Pega a temporada mais recente (primeira da lista)
    if (data.seasons && data.seasons.length > 0) {
      console.log(
        `📅 Temporada atual: ${data.seasons[0].year} (ID: ${data.seasons[0].id})`,
      );
      return data.seasons[0].id;
    }

    return null;
  } catch (error) {
    console.error("❌ Erro ao buscar season ID:", error);
    return null;
  }
}
