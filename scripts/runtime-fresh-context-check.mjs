import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:8081';
const browser = await chromium.launch({ headless: true });

try {
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();

  await page1.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page1.waitForTimeout(1500);
  await page1.getByText('Open target setup', { exact: true }).click();
  await page1.waitForTimeout(1000);
  const inputs = page1.locator('input');
  await inputs.nth(0).fill('84.7');
  await inputs.nth(1).fill('68');
  await inputs.nth(2).fill('1200');
  await inputs.nth(3).fill('110');
  await inputs.nth(4).fill('80');
  await inputs.nth(5).fill('67');
  await page1.getByText('Save starter targets', { exact: true }).click();
  await page1.waitForTimeout(1500);
  await page1.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page1.waitForTimeout(1500);
  await page1.getByText('Quick add Breakfast', { exact: true }).click({ force: true });
  await page1.waitForTimeout(1500);

  const state = await page1.evaluate(() => window.localStorage.getItem('health-app.local-mvp.state.v1'));
  await context1.close();

  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await page2.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page2.waitForTimeout(2000);
  await page2.evaluate((saved) => {
    if (saved) {
      window.localStorage.setItem('health-app.local-mvp.state.v1', saved);
    }
  }, state);
  await page2.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page2.waitForTimeout(2000);

  const body = (await page2.locator('body').innerText()).slice(0, 2000);

  console.log(JSON.stringify({
    restoredCaloriesTarget: body.includes('295 / 1200'),
    restoredBreakfastItems: body.includes('Egg Whites (1 cup) × 1') && body.includes('Natural Peanut Butter (1 tbsp) × 1'),
    restoredRemaining: body.includes('77.5 g left'),
    body,
  }, null, 2));

  await context2.close();
} catch (error) {
  console.error(JSON.stringify({ error: String(error) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
