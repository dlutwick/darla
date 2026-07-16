const { chromium } = require('playwright');

const baseUrl = process.env.BUSINESS_APP_BASE_URL || 'https://business-app-lake-tau.vercel.app';

async function clickVisibleText(page, text) {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.click();
}

async function fillInputs(page, values) {
  const inputs = page.locator('input');
  for (let i = 0; i < values.length; i += 1) {
    await inputs.nth(i).fill(values[i]);
  }
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });

  await page.goto(`${baseUrl}/product`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  await clickVisibleText(page, 'Bakery');
  await fillInputs(page, ['UI Bakery Test', '2', '9', '10', '2']);
  await page.getByRole('button', { name: 'Save Product' }).click();
  await expectText(page, 'Product saved.');

  await page.goto(`${baseUrl}/sale`);
  await page.waitForLoadState('networkidle');
  await clickVisibleText(page, 'Bakery');
  await clickVisibleText(page, 'UI Bakery Test');
  await fillInputs(page, ['2']);
  await page.getByRole('button', { name: 'Save Report Entry' }).click();
  await expectText(page, 'UI Bakery Test saved for');

  await page.goto(`${baseUrl}/summary`);
  await page.waitForLoadState('networkidle');
  const summaryText = await page.locator('body').innerText();
  console.log('SUMMARY AFTER BAKERY\n' + summaryText);

  await page.goto(`${baseUrl}/today`);
  await page.waitForLoadState('networkidle');
  const homeText = await page.locator('body').innerText();
  console.log('HOME AFTER BAKERY\n' + homeText);

  await browser.close();
})();
