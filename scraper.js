import puppeteer from "puppeteer";

export async function searchAward(from, to, date) {

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  // Vai su Air France
  await page.goto("https://wwws.airfrance.it/search/flights", {
    waitUntil: "networkidle2"
  });

  // 👉 QUI bisogna adattare i selettori (possono cambiare)
  await page.type("#origin", from);
  await page.type("#destination", to);
  await page.type("#departure-date", date);

  await page.click("#search-button");

  await page.waitForTimeout(8000);

  // Prendiamo prezzi punti
  const result = await page.evaluate(() => {

    const prices = document.querySelectorAll(".award-price");

    if (!prices.length) return null;

    return Array.from(prices).map(p => p.innerText);
  });

  await browser.close();

  return result;
}
