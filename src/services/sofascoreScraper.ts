/**
 * Scraper do SofaScore usando Puppeteer
 * Busca jogos e resultados do Brasileirão Série A em tempo real
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";

// Adiciona plugin stealth para evitar detecção de bot
puppeteer.use(StealthPlugin());

// IDs do Brasileirão Série A no SofaScore
const BRASILEIRAO_TOURNAMENT_ID = 325;
const BRASILEIRAO_SEASON_ID = 87678; // Temporada 2026

// URL base do Brasileirão 2026
const BRASILEIRAO_URL = `https://www.sofascore.com/pt/football/tournament/brazil/brasileirao-serie-a/${BRASILEIRAO_TOURNAMENT_ID}#id:${BRASILEIRAO_SEASON_ID}`;

// Mapeamento de nomes de times (SofaScore -> Nome padronizado)
const TEAM_NAME_MAP: Record<string, string> = {
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

// Browser singleton para reutilizar
let browserInstance: Browser | null = null;

/**
 * Obtém ou cria uma instância do browser
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    console.log("🌐 Iniciando navegador headless...");
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
      ],
    });
  }
  return browserInstance;
}

/**
 * Fecha o browser quando não precisar mais
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log("🔒 Navegador fechado");
  }
}

/**
 * Normaliza o nome do time para o padrão do sistema
 */
function normalizeTeamName(name: string): string {
  return TEAM_NAME_MAP[name] || name;
}

/**
 * Busca jogos do Brasileirão de uma data específica via scraping
 */
export async function fetchBrasileiraoGames(date: Date): Promise<GameData[]> {
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const url = `https://www.sofascore.com/football/${dateStr}`;

  console.log(`🔍 Buscando jogos do dia ${dateStr} via scraping...`);

  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Configura viewport e user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Navega para a página
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Aguarda carregar os jogos
    await page
      .waitForSelector('[class*="event"]', { timeout: 10000 })
      .catch(() => {
        console.log("⚠️ Nenhum evento encontrado na página");
      });

    // Extrai os dados diretamente do __NEXT_DATA__ (se disponível)
    const games = await page.evaluate((tournamentId) => {
      const results: Array<{
        id: number;
        homeTeam: string;
        awayTeam: string;
        startTimestamp: number;
        round: number;
        homeScore: number | null;
        awayScore: number | null;
        statusCode: number;
      }> = [];

      // Tenta pegar dados do script __NEXT_DATA__
      const nextDataScript = document.querySelector("#__NEXT_DATA__");
      if (nextDataScript) {
        try {
          const data = JSON.parse(nextDataScript.textContent || "{}");
          const events =
            data?.props?.pageProps?.events ||
            data?.props?.pageProps?.initialScheduleData?.events ||
            [];

          for (const event of events) {
            // Filtra apenas jogos do Brasileirão
            if (event?.tournament?.uniqueTournament?.id === tournamentId) {
              results.push({
                id: event.id,
                homeTeam: event.homeTeam?.name || event.homeTeam?.shortName,
                awayTeam: event.awayTeam?.name || event.awayTeam?.shortName,
                startTimestamp: event.startTimestamp,
                round: event.roundInfo?.round || 1,
                homeScore: event.homeScore?.current ?? null,
                awayScore: event.awayScore?.current ?? null,
                statusCode: event.status?.code || 0,
              });
            }
          }
        } catch (e) {
          console.error("Erro ao parsear __NEXT_DATA__:", e);
        }
      }

      return results;
    }, BRASILEIRAO_TOURNAMENT_ID);

    console.log(
      `📋 Encontrados ${games.length} jogos do Brasileirão via scraping`,
    );

    return games.map((game) => ({
      sofascoreId: game.id,
      homeTeam: normalizeTeamName(game.homeTeam),
      awayTeam: normalizeTeamName(game.awayTeam),
      matchDate: new Date(game.startTimestamp * 1000),
      round: game.round,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: convertStatus(game.statusCode),
    }));
  } catch (error) {
    console.error("❌ Erro ao fazer scraping:", error);
    return [];
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Busca jogos ao vivo do Brasileirão
 */
export async function fetchLiveGames(): Promise<GameData[]> {
  const url = "https://www.sofascore.com/football/livescore";

  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Aguarda um pouco para carregar
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extrai dados
    const games = await page.evaluate((tournamentId) => {
      const results: Array<{
        id: number;
        homeTeam: string;
        awayTeam: string;
        startTimestamp: number;
        round: number;
        homeScore: number | null;
        awayScore: number | null;
        statusCode: number;
      }> = [];

      const nextDataScript = document.querySelector("#__NEXT_DATA__");
      if (nextDataScript) {
        try {
          const data = JSON.parse(nextDataScript.textContent || "{}");
          const events =
            data?.props?.pageProps?.liveEvents ||
            data?.props?.pageProps?.events ||
            [];

          for (const event of events) {
            if (event?.tournament?.uniqueTournament?.id === tournamentId) {
              results.push({
                id: event.id,
                homeTeam: event.homeTeam?.name || event.homeTeam?.shortName,
                awayTeam: event.awayTeam?.name || event.awayTeam?.shortName,
                startTimestamp: event.startTimestamp,
                round: event.roundInfo?.round || 1,
                homeScore: event.homeScore?.current ?? null,
                awayScore: event.awayScore?.current ?? null,
                statusCode: event.status?.code || 0,
              });
            }
          }
        } catch (e) {
          console.error("Erro ao parsear __NEXT_DATA__:", e);
        }
      }

      return results;
    }, BRASILEIRAO_TOURNAMENT_ID);

    return games.map((game) => ({
      sofascoreId: game.id,
      homeTeam: normalizeTeamName(game.homeTeam),
      awayTeam: normalizeTeamName(game.awayTeam),
      matchDate: new Date(game.startTimestamp * 1000),
      round: game.round,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: convertStatus(game.statusCode),
    }));
  } catch (error) {
    console.error("❌ Erro ao buscar jogos ao vivo:", error);
    return [];
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Busca jogos de uma rodada específica do Brasileirão
 */
export async function fetchRoundGames(round: number): Promise<GameData[]> {
  // URL da página do Brasileirão 2026 no SofaScore com a rodada específica
  const url = `https://www.sofascore.com/pt/tournament/football/brazil/brasileirao-serie-a/${BRASILEIRAO_TOURNAMENT_ID}/season/${BRASILEIRAO_SEASON_ID}/matches/round/${round}`;

  console.log(`🔍 Buscando jogos da rodada ${round} via scraping...`);
  console.log(`📎 URL: ${url}`);

  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Aguarda carregar
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extrai dados do __NEXT_DATA__
    let games = await page.evaluate(
      (targetRound, tournamentId) => {
        const results: Array<{
          id: number;
          homeTeam: string;
          awayTeam: string;
          startTimestamp: number;
          round: number;
          homeScore: number | null;
          awayScore: number | null;
          statusCode: number;
        }> = [];

        const nextDataScript = document.querySelector("#__NEXT_DATA__");
        if (nextDataScript) {
          try {
            const data = JSON.parse(nextDataScript.textContent || "{}");
            let events =
              data?.props?.pageProps?.events ||
              data?.props?.pageProps?.initialEvents ||
              data?.props?.pageProps?.roundEvents ||
              data?.props?.pageProps?.season?.events ||
              [];
            if (events.length === 0 && data?.props?.pageProps) {
              const pageProps = data.props.pageProps;
              for (const key of Object.keys(pageProps)) {
                if (
                  Array.isArray(pageProps[key]) &&
                  pageProps[key].length > 0 &&
                  pageProps[key][0]?.homeTeam
                ) {
                  events = pageProps[key];
                  break;
                }
              }
            }
            for (const event of events) {
              const isBrasileirao =
                !event?.tournament?.uniqueTournament?.id ||
                event?.tournament?.uniqueTournament?.id === tournamentId;
              const isTargetRound =
                !event?.roundInfo?.round ||
                event?.roundInfo?.round === targetRound;
              if (
                isBrasileirao &&
                isTargetRound &&
                event?.homeTeam &&
                event?.awayTeam
              ) {
                results.push({
                  id: event.id || Math.random(),
                  homeTeam:
                    event.homeTeam?.name ||
                    event.homeTeam?.shortName ||
                    "Time A",
                  awayTeam:
                    event.awayTeam?.name ||
                    event.awayTeam?.shortName ||
                    "Time B",
                  startTimestamp: event.startTimestamp || Date.now() / 1000,
                  round: event.roundInfo?.round || targetRound,
                  homeScore: event.homeScore?.current ?? null,
                  awayScore: event.awayScore?.current ?? null,
                  statusCode: event.status?.code || 0,
                });
              }
            }
          } catch (e) {
            // Silencia erro
          }
        }
        return results;
      },
      round,
      BRASILEIRAO_TOURNAMENT_ID,
    );

    // Fallback: se não encontrou jogos, faz scraping direto do DOM
    if (!games || games.length === 0) {
      games = await page.evaluate(() => {
        const results: Array<{
          id: number;
          homeTeam: string;
          awayTeam: string;
          startTimestamp: number;
          round: number;
          homeScore: number | null;
          awayScore: number | null;
          statusCode: number;
        }> = [];
        // Seleciona todos os elementos de partidas na lista da rodada
        const matchRows = document.querySelectorAll(
          '[class*="eventRow"], [class*="EventRow"]',
        );
        matchRows.forEach((row) => {
          try {
            // Nome dos times
            const homeTeam =
              row.querySelector('[class*="HomeTeam"]')?.textContent?.trim() ||
              "";
            const awayTeam =
              row.querySelector('[class*="AwayTeam"]')?.textContent?.trim() ||
              "";
            // Placar
            const scoreEl = row.querySelector('[class*="score"]');
            let homeScore: number | null = null;
            let awayScore: number | null = null;
            if (scoreEl) {
              const scoreText = scoreEl.textContent?.trim() || "";
              const match = scoreText.match(/(\d+)\s*[xX-]\s*(\d+)/);
              if (match) {
                homeScore = parseInt(match[1], 10);
                awayScore = parseInt(match[2], 10);
              }
            }
            // Status
            let statusCode = 0;
            const statusText =
              row
                .querySelector('[class*="status"]')
                ?.textContent?.toLowerCase() || "";
            if (statusText.includes("final") || statusText.includes("encerrad"))
              statusCode = 100;
            else if (
              statusText.includes("ao vivo") ||
              statusText.includes("andamento")
            )
              statusCode = 6;
            else statusCode = 0;
            // Data/hora
            let startTimestamp = Date.now() / 1000;
            const dateEl = row.querySelector('[class*="date"]');
            if (dateEl) {
              // Exemplo: "28/01 21:00"
              const dateText = dateEl.textContent?.trim() || "";
              const match = dateText.match(
                /(\d{2})\/(\d{2})\s*(\d{2}):(\d{2})/,
              );
              if (match) {
                const [_, day, month, hour, minute] = match;
                const year = new Date().getFullYear();
                const date = new Date(
                  Number(year),
                  Number(month) - 1,
                  Number(day),
                  Number(hour),
                  Number(minute),
                );
                startTimestamp = Math.floor(date.getTime() / 1000);
              }
            }
            // Rodada (usa a informada na função)
            let round = 2;
            if (!games || games.length === 0) {
              games = await page.evaluate(function(round) {
                var results = [];
                var matchLinks = document.querySelectorAll('a[class^="event-hl-"]');
                for (var i = 0; i < matchLinks.length; i++) {
                  var a = matchLinks[i];
                  try {
                    var dateBdi = a.querySelector('bdi.textStyle_body.small');
                    var dateText = dateBdi && dateBdi.textContent ? dateBdi.textContent.trim() : "";
                    var hourBdi = a.querySelector('span.score bdi.textStyle_body.small');
                    var hourText = hourBdi && hourBdi.textContent ? hourBdi.textContent.trim() : "";
                    var teamBdis = a.querySelectorAll('bdi.textStyle_body.medium.c_neutrals.nLv1.trunc_true');
                    var homeTeam = teamBdis[0] && teamBdis[0].textContent ? teamBdis[0].textContent.trim() : "";
                    var awayTeam = teamBdis[1] && teamBdis[1].textContent ? teamBdis[1].textContent.trim() : "";
                    var scoreSpans = a.querySelectorAll('span.score');
                    var homeScore = null;
                    var awayScore = null;
                    var statusCode = 0;
                    if (scoreSpans.length > 1) {
                      var scoreText = scoreSpans[1].textContent ? scoreSpans[1].textContent.trim() : "";
                      var match = scoreText.match(/(\d+)\s*[xX-]\s*(\d+)/);
                      if (match) {
                        homeScore = parseInt(match[1], 10);
                        awayScore = parseInt(match[2], 10);
                        statusCode = 100;
                      }
                    }
                    if (homeScore === null && awayScore === null) statusCode = 0;
                    var startTimestamp = Date.now() / 1000;
                    if (dateText && hourText) {
                      var m = dateText.match(/(\d{2})\/(\d{2})\/(\d{2})/);
                      var day, month, year;
                      if (m) {
                        day = m[1]; month = m[2]; year = m[3];
                      } else {
                        var m2 = dateText.match(/(\d{2})\/(\d{2})/);
                        if (m2) {
                          day = m2[1]; month = m2[2];
                          year = String(new Date().getFullYear()).slice(-2);
                        }
                      }
                      var fullYear = 2000 + parseInt(year, 10);
                      var hmin = hourText.split(":");
                      var h = parseInt(hmin[0], 10), min = parseInt(hmin[1], 10);
                      var date = new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), h, min);
                      startTimestamp = Math.floor(date.getTime() / 1000);
                    }
                    if (homeTeam && awayTeam) {
                      results.push({
                        id: Math.random(),
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        startTimestamp: startTimestamp,
                        round: round,
                        homeScore: homeScore,
                        awayScore: awayScore,
                        statusCode: statusCode,
                      });
                    }
                  } catch (e) {
                    // ignora erro de linha
                  }
                }
                return results;
              }, round);
              console.log(`📋 [DOM] Encontrados ${games.length} jogos da rodada`);
            }
    console.log("🧪 Testando scraping do SofaScore...");
    const games = await fetchBrasileiraoFromMainPage();

    if (games.length > 0) {
      return {
        success: true,
        message: `Scraping funcionando! ${games.length} jogos encontrados.`,
        games,
      };
    } else {
      return {
        success: true,
        message: "Scraping funcionando, mas sem jogos encontrados na página.",
        games: [],
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro no scraping: ${error}`,
      games: [],
    };
  }
}

/**
 * Busca jogos diretamente da página principal do Brasileirão 2026
 */
export async function fetchBrasileiraoFromMainPage(): Promise<GameData[]> {
  console.log(`🔍 Acessando página principal do Brasileirão 2026...`);
  console.log(`📎 URL: ${BRASILEIRAO_URL}`);

  let page: Page | null = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Intercepta as requisições de API para pegar os dados diretamente
    const apiResponses: any[] = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("api.sofascore.com") && url.includes("events")) {
        try {
          const json = await response.json();
          if (json.events) {
            apiResponses.push(...json.events);
          }
        } catch (e) {
          // Ignora respostas não-JSON
        }
      }
    });

    await page.goto(BRASILEIRAO_URL, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Aguarda um pouco para capturar as respostas da API
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Primeiro tenta usar os dados capturados da API
    if (apiResponses.length > 0) {
      console.log(`📡 Capturados ${apiResponses.length} eventos via API`);
      return apiResponses.map((event) => ({
        sofascoreId: event.id,
        homeTeam: normalizeTeamName(
          event.homeTeam?.name || event.homeTeam?.shortName || "",
        ),
        awayTeam: normalizeTeamName(
          event.awayTeam?.name || event.awayTeam?.shortName || "",
        ),
        matchDate: new Date(event.startTimestamp * 1000),
        round: event.roundInfo?.round || 1,
        homeScore: event.homeScore?.current ?? null,
        awayScore: event.awayScore?.current ?? null,
        status: convertStatus(event.status?.code || 0),
      }));
    }

    // Se não pegou da API, tenta extrair do __NEXT_DATA__
    let games = await page.evaluate(() => {
      const results: Array<{
        id: number;
        homeTeam: string;
        awayTeam: string;
        startTimestamp: number;
        round: number;
        homeScore: number | null;
        awayScore: number | null;
        statusCode: number;
      }> = [];

      const nextDataScript = document.querySelector("#__NEXT_DATA__");
      if (nextDataScript) {
        try {
          const data = JSON.parse(nextDataScript.textContent || "{}");
          let events: any[] = [];
          const pageProps = data?.props?.pageProps || {};
          const paths = [
            pageProps.events,
            pageProps.initialEvents,
            pageProps.tournament?.events,
            pageProps.season?.events,
            pageProps.upcomingEvents,
            pageProps.lastEvents,
          ];
          for (const path of paths) {
            if (Array.isArray(path) && path.length > 0) {
              events = path;
              break;
            }
          }
          for (const event of events) {
            if (event?.homeTeam && event?.awayTeam) {
              results.push({
                id: event.id || Math.random(),
                homeTeam:
                  event.homeTeam?.name || event.homeTeam?.shortName || "Time A",
                awayTeam:
                  event.awayTeam?.name || event.awayTeam?.shortName || "Time B",
                startTimestamp: event.startTimestamp || Date.now() / 1000,
                round: event.roundInfo?.round || 1,
                homeScore: event.homeScore?.current ?? null,
                awayScore: event.awayScore?.current ?? null,
                statusCode: event.status?.code || 0,
              });
            }
          }
        } catch (e) {
          // Silencia erro
        }
      }
      return results;
    });

    // Fallback: se não encontrou jogos, faz scraping direto do DOM
    if (!games || games.length === 0) {
      games = await page.evaluate(() => {
        const results: Array<{
          id: number;
          homeTeam: string;
          awayTeam: string;
          startTimestamp: number;
          round: number;
          homeScore: number | null;
          awayScore: number | null;
          statusCode: number;
        }> = [];
        // Seleciona todos os elementos de partidas na lista da rodada
        const matchRows = document.querySelectorAll(
          '[class*="eventRow"], [class*="EventRow"]',
        );
        matchRows.forEach((row) => {
          try {
            // Nome dos times
            const homeTeam =
              row.querySelector('[class*="HomeTeam"]')?.textContent?.trim() ||
              "";
            const awayTeam =
              row.querySelector('[class*="AwayTeam"]')?.textContent?.trim() ||
              "";
            // Placar
            const scoreEl = row.querySelector('[class*="score"]');
            let homeScore: number | null = null;
            let awayScore: number | null = null;
            if (scoreEl) {
              const scoreText = scoreEl.textContent?.trim() || "";
              const match = scoreText.match(/(\d+)\s*[xX-]\s*(\d+)/);
              if (match) {
                homeScore = parseInt(match[1], 10);
                awayScore = parseInt(match[2], 10);
              }
            }
            // Status
            let statusCode = 0;
            const statusText =
              row
                .querySelector('[class*="status"]')
                ?.textContent?.toLowerCase() || "";
            if (statusText.includes("final") || statusText.includes("encerrad"))
              statusCode = 100;
            else if (
              statusText.includes("ao vivo") ||
              statusText.includes("andamento")
            )
              statusCode = 6;
            else statusCode = 0;
            // Data/hora
            let startTimestamp = Date.now() / 1000;
            const dateEl = row.querySelector('[class*="date"]');
            if (dateEl) {
              // Exemplo: "28/01 21:00"
              const dateText = dateEl.textContent?.trim() || "";
              const match = dateText.match(
                /(\d{2})\/(\d{2})\s*(\d{2}):(\d{2})/,
              );
              if (match) {
                const [_, day, month, hour, minute] = match;
                const year = new Date().getFullYear();
                const date = new Date(
                  Number(year),
                  Number(month) - 1,
                  Number(day),
                  Number(hour),
                  Number(minute),
                );
                startTimestamp = Math.floor(date.getTime() / 1000);
              }
            }
            // Rodada (se disponível)
            let round = 1;
            const roundEl = document.querySelector(
              '[class*="roundSelector"] [class*="selected"]',
            );
            if (roundEl) {
              const roundText = roundEl.textContent?.replace(/[^\d]/g, "");
              if (roundText) round = parseInt(roundText, 10);
            }
            if (homeTeam && awayTeam) {
              results.push({
                id: Math.random(),
                homeTeam,
                awayTeam,
                startTimestamp,
                round,
                homeScore,
                awayScore,
                statusCode,
              });
            }
          } catch (e) {
            // ignora erro de linha
          }
        });
        return results;
      });
      console.log(`📋 [DOM] Encontrados ${games.length} jogos do Brasileirão`);
    }

    console.log(`📋 Encontrados ${games.length} jogos do Brasileirão`);

    return games.map((game) => ({
      sofascoreId: game.id,
      homeTeam: normalizeTeamName(game.homeTeam),
      awayTeam: normalizeTeamName(game.awayTeam),
      matchDate: new Date(game.startTimestamp * 1000),
      round: game.round,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: convertStatus(game.statusCode),
    }));
  } catch (error) {
    console.error("❌ Erro ao acessar página do Brasileirão:", error);
    return [];
  } finally {
    if (page) {
      await page.close();
    }
  }
}
