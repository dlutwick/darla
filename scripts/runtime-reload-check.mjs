import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:8081';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2000);

  const firstBody = (await page.locator('body').innerText()).slice(0, 2000);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2000);

  const secondBody = (await page.locator('body').innerText()).slice(0, 2000);

  console.log(JSON.stringify({
    firstBody,
    secondBody,
    persistedCaloriesTarget: secondBody.includes('295 / 1200'),
    persistedBreakfastItems: secondBody.includes('Egg Whites (1 cup) × 1') && secondBody.includes('Natural Peanut Butter (1 tbsp) × 1'),
    persistedRemaining: secondBody.includes('77.5 g left')
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: String(error) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
