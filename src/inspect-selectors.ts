/**
 * Script para inspecionar e atualizar os seletores corretos do SofaScore
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const BRASILEIRAO_URL = `https://www.sofascore.com/pt/football/tournament/brazil/brasileirao-serie-a/325#id:87678`;

async function inspectSelectors() {
  console.log("🔍 Inspecionando seletores da página...\n");

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`📎 Acessando: ${BRASILEIRAO_URL}\n`);
  await page.goto(BRASILEIRAO_URL, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  // Aguarda carregar
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Inspeciona anchors
  const anchorInfo = await page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[class*="event-hl-"]'),
    );

    return anchors.slice(0, 2).map((a) => {
      // Tenta vários seletores diferentes
      const tests = {
        "text()": a.textContent?.trim() || "",
        "bdi total": a.querySelectorAll("bdi").length,
        "span total": a.querySelectorAll("span").length,
        "div total": a.querySelectorAll("div").length,
        classes: a.className,
        "innerHTML (primeiros 1000)": a.innerHTML.substring(0, 1000),
      };

      // Tenta encontrar nomes dos times
      const allText = Array.from(a.querySelectorAll("*"))
        .map((el) => el.textContent?.trim())
        .filter((t) => t && t.length > 2 && t.length < 30)
        .filter((t, i, arr) => arr.indexOf(t) === i); // remove duplicados

      return { tests, allText };
    });
  });

  console.log("📋 Informações capturadas:");
  console.log(JSON.stringify(anchorInfo, null, 2));

  console.log(
    "\n⏳ Navegador permanecerá aberto por 60 segundos para inspeção manual...",
  );
  await new Promise((resolve) => setTimeout(resolve, 60000));

  await browser.close();
}

inspectSelectors().catch(console.error);
