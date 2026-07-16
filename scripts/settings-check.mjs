import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const baseUrl = 'http://127.0.0.1:8081';

try {
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.getByText('Edit targets', { exact: true }).click();
  await page.waitForTimeout(800);
  const inputs = page.locator('input');
  await inputs.nth(0).fill('84.7');
  await inputs.nth(1).fill('68');
  await inputs.nth(2).fill('1200');
  await inputs.nth(3).fill('110');
  await inputs.nth(4).fill('80');
  await inputs.nth(5).fill('67');
  await page.getByText('Save targets', { exact: true }).click();
  await page.waitForTimeout(1800);
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1800);
  const body = (await page.locator('body').innerText()).slice(0, 2000);
  console.log(JSON.stringify({
    hasCalories: body.includes('1200'),
    hasProtein: body.includes('110 g'),
    hasCarbs: body.includes('80 g'),
    hasFat: body.includes('67 g'),
    hasCurrentWeight: body.includes('84.7 kg'),
    hasGoalWeight: body.includes('68 kg'),
    hasSavedLocally: body.includes('Saved locally'),
    body,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: String(error) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
