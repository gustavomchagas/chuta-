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
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";
  isPostponed?: boolean;
  postponedReason?: string;
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
 * Converte o código de status do SofaScore para o status do sistema
 * Códigos: 0=SCHEDULED, 6-50=LIVE, 70=POSTPONED, 80=CANCELLED, 100=FINISHED
 */
function convertStatus(
  statusCode: number,
): "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED" {
  if (statusCode === 100) return "FINISHED"; // Finalizado
  if (statusCode === 70) return "POSTPONED"; // Adiado
  if (statusCode === 80 || statusCode === 90) return "CANCELLED"; // Cancelado
  if (statusCode >= 6 && statusCode <= 50) return "LIVE"; // Ao vivo
  return "SCHEDULED"; // Agendado
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
  // Usamos a página principal do Brasileirão e selecionamos a rodada via DOM
  const url = BRASILEIRAO_URL;

  console.log(`🔍 Buscando jogos da rodada ${round} via scraping...`);
  console.log(`📎 URL base: ${url}`);

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

    // Se foi solicitada uma rodada específica, tenta selecionar essa rodada no DOM
    if (round && round > 0) {
      try {
        // espera carregamento leve
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 1) Tenta selecionar por texto "Rodada X" ou apenas número
        await page.evaluate(
          new Function(
            "targetRound",
            "var clickIf=function(el){if(!el)return false;try{el.click();return true}catch(e){return false}};var roundText=String(targetRound);var candidates=Array.prototype.slice.call(document.querySelectorAll('button, a, div, span'));for(var i=0;i<candidates.length;i++){var c=candidates[i];var txt=(c.textContent||'').trim();if(!txt)continue;if(txt.indexOf('Rodada')!==-1&&txt.indexOf(roundText)!==-1){if(clickIf(c))return}if(/^\\d+$/.test(txt)&&txt===roundText){if(clickIf(c))return}}",
          ) as unknown as any,
          round,
        );

        // espera conteúdo reagir
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 2) Se ainda não selecionou, tenta clicar repetidamente no botão "próximo" (seta SVG)
        const alreadySelected = await page.evaluate((targetRound) => {
          const sel = document.querySelector(
            '[class*="roundSelector"] [class*="selected"]',
          );
          const txt = sel ? (sel.textContent || "").replace(/[^0-9]/g, "") : "";
          return txt === String(targetRound);
        }, round);

        if (!alreadySelected) {
          // Primeiro verifica qual rodada está selecionada
          const currentRound = await page.evaluate(() => {
            const sel = document.querySelector(
              '[class*="roundSelector"] [class*="selected"]',
            );
            const txt = sel
              ? (sel.textContent || "").replace(/[^0-9]/g, "")
              : "";
            return txt ? parseInt(txt, 10) : 1;
          });

          const targetRound = round;
          const needsNext = targetRound > currentRound;
          const needsPrev = targetRound < currentRound;
          const maxClicks = Math.abs(targetRound - currentRound);

          // Clica na seta apropriada (anterior ou próximo)
          for (let i = 0; i < maxClicks && i < 10; i++) {
            const clicked = await page.evaluate((goNext) => {
              try {
                // Procura por paths de svg que são setas
                const paths = Array.from(document.querySelectorAll("svg path"));
                const buttons: HTMLElement[] = [];

                for (const p of paths) {
                  const d = p.getAttribute("d") || "";
                  // M18 12 é seta próximo (direita), M6 12 é seta anterior (esquerda)
                  if (
                    (goNext && d.indexOf("M18 12") !== -1) ||
                    (!goNext && d.indexOf("M6 12") !== -1)
                  ) {
                    const btn = p.closest("button, a, div") as HTMLElement;
                    if (btn && !buttons.includes(btn)) {
                      buttons.push(btn);
                    }
                  }
                }

                if (buttons.length > 0) {
                  buttons[0].click();
                  return true;
                }
              } catch (e) {}
              return false;
            }, needsNext);

            if (!clicked) break;
            await new Promise((resolve) => setTimeout(resolve, 800));

            const nowSelected = await page.evaluate((targetRound) => {
              const sel = document.querySelector(
                '[class*="roundSelector"] [class*="selected"]',
              );
              const txt = sel
                ? (sel.textContent || "").replace(/[^0-9]/g, "")
                : "";
              return txt === String(targetRound);
            }, targetRound);

            if (nowSelected) break;
          }
        }
      } catch (e) {
        // não fatal — continuamos e tentamos capturar via DOM/API mesmo assim
        console.log(
          "⚠️ Não foi possível selecionar a rodada via DOM automaticamente:",
          e,
        );
      }
    }

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

        // Seleciona anchors de jogos
        const anchors = Array.from(
          document.querySelectorAll('a[class*="event-hl-"]'),
        );

        anchors.forEach((a) => {
          try {
            // Pega o ID do jogo do atributo data-id
            const idStr = a.getAttribute("data-id");
            const id = idStr ? parseInt(idStr, 10) : Math.random();

            const fullText = a.textContent || "";

            // Extrai data e hora (formatos: "dd/mm/aa HH:MM" ou "dd/mm/aaHH:MM" ou "dd/mm/aa")
            const dateTimeMatch = fullText.match(
              /(\d{2})\/(\d{2})\/(\d{2})\s*(\d{1,2}):(\d{2})/,
            );
            const dateOnlyMatch = fullText.match(/(\d{2})\/(\d{2})\/(\d{2})/);
            let startTimestamp: number;

            if (dateTimeMatch) {
              // Formato com hora: DD/MM/AA HH:MM ou DD/MM/AAHH:MM
              const day = parseInt(dateTimeMatch[1], 10);
              const month = parseInt(dateTimeMatch[2], 10) - 1; // JS months are 0-indexed
              const yearStr = dateTimeMatch[3];
              const year = 2000 + parseInt(yearStr, 10);
              const hour = parseInt(dateTimeMatch[4], 10);
              const minute = parseInt(dateTimeMatch[5], 10);

              const d = new Date(year, month, day, hour, minute);
              startTimestamp = Math.floor(d.getTime() / 1000);
            } else if (dateOnlyMatch) {
              // Formato sem hora: DD/MM/AA
              const day = parseInt(dateOnlyMatch[1], 10);
              const month = parseInt(dateOnlyMatch[2], 10) - 1;
              const yearStr = dateOnlyMatch[3];
              const year = 2000 + parseInt(yearStr, 10);

              const d = new Date(year, month, day, 0, 0);
              startTimestamp = Math.floor(d.getTime() / 1000);
            } else {
              startTimestamp = Math.floor(Date.now() / 1000);
            }

            // Detecta status: "F" seguido de número indica finalizado (F2°T = Finalizado 2º Tempo)
            const statusMatch = fullText.match(/F\d+°T/);
            const isFinished = !!statusMatch;
            const statusCode = isFinished ? 100 : 0;

            // Extrai placar: dois dígitos consecutivos no final (só se finalizado)
            let homeScore: number | null = null;
            let awayScore: number | null = null;

            if (isFinished) {
              // Remove data e status para facilitar extração
              let textClean = fullText
                .replace(/\d{2}\/\d{2}\/\d{2}/, "")
                .replace(/F\d+°T/, "");
              // Pega os últimos 2 dígitos consecutivos
              const scoreMatch = textClean.match(/(\d)(\d)$/);
              if (scoreMatch) {
                homeScore = parseInt(scoreMatch[1], 10);
                awayScore = parseInt(scoreMatch[2], 10);
              }
            }

            // Extrai nomes dos times do allText
            const allTexts = Array.from(a.querySelectorAll("*"))
              .map((el) => (el.textContent || "").trim())
              .filter((t) => t && t.length >= 3 && t.length < 30);

            // Pega textos únicos
            const unique = allTexts.filter((t, i, arr) => arr.indexOf(t) === i);

            // Procura os dois últimos nomes que parecem ser times
            const teamCandidates = unique.filter(
              (t) =>
                !/^[\d:\/]+$/.test(t) && // Não é só números
                !/^F\d+°T$/.test(t) && // Não é status
                !/^\d{2}\/\d{2}\/\d{2}$/.test(t) && // Não é data
                t.length >= 3,
            );

            let homeTeam = "";
            let awayTeam = "";

            if (teamCandidates.length >= 2) {
              // Os dois últimos são os times (último é visitante, penúltimo é mandante)
              awayTeam = teamCandidates[teamCandidates.length - 1];
              homeTeam = teamCandidates[teamCandidates.length - 2];
            }

            if (homeTeam && awayTeam) {
              results.push({
                id,
                homeTeam,
                awayTeam,
                startTimestamp,
                round: 1,
                homeScore,
                awayScore,
                statusCode,
              });
            }
          } catch (e) {
            /* ignore */
          }
        });

        return results;
      });
      console.log(`📋 [DOM] Encontrados ${games.length} jogos do Brasileirão`);
    }

    console.log(`📋 Encontrados ${games.length} jogos da rodada ${round}`);

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
    console.error("❌ Erro ao buscar jogos da rodada:", error);
    return [];
  } finally {
    if (page) {
      await page.close();
    }
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

        // Seleciona anchors de jogos
        const anchors = Array.from(
          document.querySelectorAll('a[class*="event-hl-"]'),
        );

        anchors.forEach((a) => {
          try {
            // Pega o ID do jogo do atributo data-id
            const idStr = a.getAttribute("data-id");
            const id = idStr ? parseInt(idStr, 10) : Math.random();

            const fullText = a.textContent || "";

            // Extrai data e hora (formatos: "dd/mm/aa HH:MM" ou "dd/mm/aaHH:MM" ou "dd/mm/aa")
            const dateTimeMatch = fullText.match(
              /(\d{2})\/(\d{2})\/(\d{2})\s*(\d{1,2}):(\d{2})/,
            );
            const dateOnlyMatch = fullText.match(/(\d{2})\/(\d{2})\/(\d{2})/);
            let startTimestamp: number;

            if (dateTimeMatch) {
              // Formato com hora: DD/MM/AA HH:MM ou DD/MM/AAHH:MM
              const day = parseInt(dateTimeMatch[1], 10);
              const month = parseInt(dateTimeMatch[2], 10) - 1; // JS months are 0-indexed
              const yearStr = dateTimeMatch[3];
              const year = 2000 + parseInt(yearStr, 10);
              const hour = parseInt(dateTimeMatch[4], 10);
              const minute = parseInt(dateTimeMatch[5], 10);

              const d = new Date(year, month, day, hour, minute);
              startTimestamp = Math.floor(d.getTime() / 1000);
            } else if (dateOnlyMatch) {
              // Formato sem hora: DD/MM/AA
              const day = parseInt(dateOnlyMatch[1], 10);
              const month = parseInt(dateOnlyMatch[2], 10) - 1;
              const yearStr = dateOnlyMatch[3];
              const year = 2000 + parseInt(yearStr, 10);

              const d = new Date(year, month, day, 0, 0);
              startTimestamp = Math.floor(d.getTime() / 1000);
            } else {
              startTimestamp = Math.floor(Date.now() / 1000);
            }

            // Detecta status: "F" seguido de número indica finalizado (F2°T = Finalizado 2º Tempo)
            const statusMatch = fullText.match(/F\d+°T/);
            const isFinished = !!statusMatch;
            const statusCode = isFinished ? 100 : 0;

            // Extrai placar: dois dígitos consecutivos no final (só se finalizado)
            let homeScore: number | null = null;
            let awayScore: number | null = null;

            if (isFinished) {
              // Remove data e status para facilitar extração
              let textClean = fullText
                .replace(/\d{2}\/\d{2}\/\d{2}/, "")
                .replace(/F\d+°T/, "");
              // Pega os últimos 2 dígitos consecutivos
              const scoreMatch = textClean.match(/(\d)(\d)$/);
              if (scoreMatch) {
                homeScore = parseInt(scoreMatch[1], 10);
                awayScore = parseInt(scoreMatch[2], 10);
              }
            }

            // Extrai nomes dos times do allText
            const allTexts = Array.from(a.querySelectorAll("*"))
              .map((el) => (el.textContent || "").trim())
              .filter((t) => t && t.length >= 3 && t.length < 30);

            // Pega textos únicos
            const unique = allTexts.filter((t, i, arr) => arr.indexOf(t) === i);

            // Procura os dois últimos nomes que parecem ser times
            const teamCandidates = unique.filter(
              (t) =>
                !/^[\d:\/]+$/.test(t) && // Não é só números
                !/^F\d+°T$/.test(t) && // Não é status
                !/^\d{2}\/\d{2}\/\d{2}$/.test(t) && // Não é data
                t.length >= 3,
            );

            let homeTeam = "";
            let awayTeam = "";

            if (teamCandidates.length >= 2) {
              // Os dois últimos são os times (último é visitante, penúltimo é mandante)
              awayTeam = teamCandidates[teamCandidates.length - 1];
              homeTeam = teamCandidates[teamCandidates.length - 2];
            }

            // Detecta rodada do seletor
            let round = 1;
            const roundEl = document.querySelector(
              '[class*="roundSelector"] [class*="selected"]',
            );
            if (roundEl) {
              const roundText = (roundEl.textContent || "").replace(
                /[^\d]/g,
                "",
              );
              if (roundText) round = parseInt(roundText, 10);
            }

            if (homeTeam && awayTeam) {
              results.push({
                id,
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
            /* ignore */
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

/**
 * Função de teste para validar o scraping
 */
export async function testScraping(): Promise<void> {
  console.log("\n🧪 Iniciando teste do scraper...\n");

  try {
    // Testa busca da página principal
    console.log("1️⃣ Testando fetchBrasileiraoFromMainPage()...");
    const mainPageGames = await fetchBrasileiraoFromMainPage();
    console.log(
      `✅ Encontrados ${mainPageGames.length} jogos na página principal`,
    );
    if (mainPageGames.length > 0) {
      console.log("Exemplo:", mainPageGames[0]);
    }

    // Testa busca de rodada específica
    console.log("\n2️⃣ Testando fetchRoundGames(1)...");
    const round1Games = await fetchRoundGames(1);
    console.log(`✅ Encontrados ${round1Games.length} jogos na rodada 1`);
    if (round1Games.length > 0) {
      console.log("Exemplo:", round1Games[0]);
    }

    // Testa busca de jogos ao vivo
    console.log("\n3️⃣ Testando fetchLiveGames()...");
    const liveGames = await fetchLiveGames();
    console.log(`✅ Encontrados ${liveGames.length} jogos ao vivo`);

    console.log("\n✅ Teste concluído!");
  } catch (error) {
    console.error("\n❌ Erro no teste:", error);
  } finally {
    await closeBrowser();
  }
}
