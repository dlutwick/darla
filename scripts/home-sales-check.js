const { chromium } = require('playwright');

const baseUrl = process.env.BUSINESS_APP_BASE_URL || 'https://business-app-lake-tau.vercel.app';

async function expectContains(page, text) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: 'visible', timeout: 15000 });
}

async function addProduct(page, { business, name, cost, price, stock, reorder }) {
  await page.goto(`${baseUrl}/product`);
  await page.waitForLoadState('networkidle');
  await page.getByText(business, { exact: true }).first().click();
  const inputs = page.locator('input');
  await inputs.nth(0).fill(name);
  await inputs.nth(1).fill(cost);
  await inputs.nth(2).fill(price);
  await inputs.nth(3).fill(stock);
  await inputs.nth(4).fill(reorder);
  await page.getByRole('button', { name: 'Save Product' }).click();
  await expectContains(page, 'Product saved.');
}

async function addSale(page, { business, product, qty, date }) {
  await page.goto(`${baseUrl}/sale`);
  await page.waitForLoadState('networkidle');
  await page.getByText(business, { exact: true }).first().click();
  await page.getByText(product, { exact: true }).first().click();
  const inputs = page.locator('input');
  await inputs.nth(0).fill(String(qty));
  await inputs.nth(1).fill(date);
  await page.getByRole('button', { name: 'Save Report Entry' }).click();
  await expectContains(page, `${product} saved for ${date}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/product`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => localStorage.clear());

  await addProduct(page, { business: 'Bakery', name: 'Bakery Home Check', cost: '2', price: '9', stock: '10', reorder: '2' });
  await addSale(page, { business: 'Bakery', product: 'Bakery Home Check', qty: 1, date: '2026-04-17' });
  await page.goto(`${baseUrl}/today`);
  await page.waitForLoadState('networkidle');
  console.log('HOME AFTER BAKERY\n' + await page.locator('body').innerText());

  await addProduct(page, { business: 'Craft', name: 'Craft Home Check', cost: '4', price: '14', stock: '10', reorder: '2' });
  await addSale(page, { business: 'Crafts', product: 'Craft Home Check', qty: 1, date: '2026-04-17' });
  await page.goto(`${baseUrl}/today`);
  await page.waitForLoadState('networkidle');
  console.log('HOME AFTER BOTH\n' + await page.locator('body').innerText());

  await page.goto(`${baseUrl}/summary`);
  await page.waitForLoadState('networkidle');
  console.log('SUMMARY\n' + await page.locator('body').innerText());

  await browser.close();
})();
