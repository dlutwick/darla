import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:8081';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);

  const before = await page.evaluate(() => ({
    keys: Object.keys(window.localStorage),
    state: window.localStorage.getItem('health-app.local-mvp.state.v1')
  }));

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);
  const setupButton = page.getByText('Open target setup', { exact: true });
  if (await setupButton.count()) {
    await setupButton.click();
    await page.waitForTimeout(1000);
    const inputs = page.locator('input');
    if (await inputs.count() >= 6) {
      await inputs.nth(0).fill('84.7');
      await inputs.nth(1).fill('68');
      await inputs.nth(2).fill('1200');
      await inputs.nth(3).fill('110');
      await inputs.nth(4).fill('80');
      await inputs.nth(5).fill('67');
      await page.getByText('Save starter targets', { exact: true }).click();
      await page.waitForTimeout(2000);
    }
  }

  const afterSave = await page.evaluate(() => ({
    keys: Object.keys(window.localStorage),
    state: window.localStorage.getItem('health-app.local-mvp.state.v1')
  }));

  console.log(JSON.stringify({ before, afterSave }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: String(error) }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
