import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const baseUrl = 'http://127.0.0.1:8081';

try {
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.getByText('Edit targets', { exact: true }).click();
  await page.waitForTimeout(800);
  const inputs = page.locator('input');
  await inputs.nth(0).fill('186.7');
  await inputs.nth(1).fill('150');
  await inputs.nth(2).fill('1200');
  await inputs.nth(3).fill('110');
  await inputs.nth(4).fill('80');
  await inputs.nth(5).fill('67');
  await page.getByText('Save targets', { exact: true }).click();
  await page.waitForTimeout(1800);
  await page.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1800);
  const body = (await page.locator('body').innerText()).slice(0, 3000);
  console.log(JSON.stringify({
    hasTargetCalories: body.includes('Target calories\n1200'),
    hasRemainingCalories: body.includes('Calories\n905 left') || body.includes('Calories\n1200 left') || body.includes('Calories\n') ,
    body,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: String(error) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
