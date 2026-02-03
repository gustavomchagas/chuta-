import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(
    "https://www.sofascore.com/pt/football/tournament/brazil/brasileirao-serie-a/325#id:87678",
    { waitUntil: "networkidle2", timeout: 30000 },
  );

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Tenta clicar na seta para ir para rodada 2
  await page.evaluate(() => {
    const paths = Array.from(document.querySelectorAll("svg path"));
    for (const p of paths) {
      const d = p.getAttribute("d") || "";
      if (d.indexOf("M18 12") !== -1) {
        const btn = p.closest("button, a, div");
        if (btn) {
          (btn as HTMLElement).click();
          break;
        }
      }
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Extrai os textos completos dos primeiros 3 jogos
  const texts = await page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[class*="event-hl-"]'),
    );
    return anchors.slice(0, 3).map((a) => ({
      fullText: a.textContent || "",
      innerHTML: a.innerHTML,
    }));
  });

  console.log("\n=== PRIMEIROS 3 JOGOS ===\n");
  texts.forEach((t, i) => {
    console.log(`\nJOGO ${i + 1}:`);
    console.log("FullText:", t.fullText);
    console.log("\nHTML:", t.innerHTML.substring(0, 500), "...\n");
    console.log("---");
  });

  await browser.close();
})();
