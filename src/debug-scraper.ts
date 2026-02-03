/**
 * Script de debug para capturar HTML da página do SofaScore
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";

puppeteer.use(StealthPlugin());

const BRASILEIRAO_URL = `https://www.sofascore.com/pt/football/tournament/brazil/brasileirao-serie-a/325#id:87678`;

async function debugScraper() {
  console.log("🔍 Iniciando debug do scraper...\n");

  const browser = await puppeteer.launch({
    headless: false, // Modo headful para ver o navegador
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
    ],
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  console.log(`📎 Acessando: ${BRASILEIRAO_URL}\n`);

  await page.goto(BRASILEIRAO_URL, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  // Aguarda carregar
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("📸 Tentando selecionar rodada 2...\n");

  // Tenta clicar no botão de próxima rodada
  for (let i = 0; i < 2; i++) {
    const clicked = await page.evaluate(() => {
      try {
        const paths = Array.from(document.querySelectorAll("svg path"));
        for (const p of paths) {
          const d = p.getAttribute("d") || "";
          if (d.indexOf("M18 12") !== -1) {
            const btn = p.closest("button, a, div");
            if (btn && btn instanceof HTMLElement) {
              btn.click();
              return true;
            }
          }
        }
      } catch (e) {}
      return false;
    });

    console.log(`Click ${i + 1}: ${clicked ? "✅" : "❌"}`);

    if (clicked) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // Aguarda mais um pouco
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("\n📋 Capturando informações da página...\n");

  // Captura informações
  const info = await page.evaluate(() => {
    const result: any = {};

    // Verifica __NEXT_DATA__
    const nextDataScript = document.querySelector("#__NEXT_DATA__");
    if (nextDataScript) {
      try {
        const data = JSON.parse(nextDataScript.textContent || "{}");
        result.hasNextData = true;
        result.nextDataKeys = Object.keys(data?.props?.pageProps || {});
      } catch (e) {
        result.hasNextData = false;
      }
    }

    // Seleciona elementos de jogos
    result.eventHlAnchors = document.querySelectorAll(
      'a[class*="event-hl-"]',
    ).length;
    result.eventRows = document.querySelectorAll(
      '[class*="eventRow"], [class*="EventRow"]',
    ).length;

    // Rodada selecionada
    const roundSelector = document.querySelector(
      '[class*="roundSelector"] [class*="selected"]',
    );
    result.selectedRound = roundSelector?.textContent?.trim() || "N/A";

    // Captura alguns anchors de exemplo
    const anchors = Array.from(
      document.querySelectorAll('a[class*="event-hl-"]'),
    ).slice(0, 3);
    result.anchorSamples = anchors.map((a) => ({
      outerHTML: (a as HTMLElement).outerHTML.substring(0, 500),
      teamBdis: a.querySelectorAll("bdi.textStyle_body.medium").length,
    }));

    return result;
  });

  console.log("📊 Informações capturadas:");
  console.log(JSON.stringify(info, null, 2));

  // Salva o HTML completo
  const html = await page.content();
  const outputPath = path.join(process.cwd(), "sofascore-debug.html");
  fs.writeFileSync(outputPath, html, "utf-8");

  console.log(`\n💾 HTML salvo em: ${outputPath}`);
  console.log(`\n⏳ Navegador ficará aberto por 30 segundos para inspeção...`);

  await new Promise((resolve) => setTimeout(resolve, 30000));

  await browser.close();
  console.log("\n✅ Debug concluído!");
}

debugScraper().catch(console.error);
