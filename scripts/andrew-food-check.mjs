import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const baseUrl = 'http://127.0.0.1:8081';

try {
  await page.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText();
  console.log(JSON.stringify({
    hasEzekielBread: body.includes('Ezekiel Bread (1 Slice)'),
    hasSweetPotato: body.includes('1 Medium Sweet Potato'),
    hasCannedTuna: body.includes('Canned Tuna (1 can, in water)'),
    hasQuinoa: body.includes('Quinoa (1/2 cup, cooked)'),
    sample: body.slice(0, 4000)
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: String(error) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
