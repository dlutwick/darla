const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseUrl = process.env.BUSINESS_APP_BASE_URL || 'http://127.0.0.1:4173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/product`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  await addProduct(page, { business: 'Bakery', name: 'Butter Tarts Test', cost: '1.25', price: '3.5', stock: '4', reorder: '3' });
  await addProduct(page, { business: 'Bakery', name: 'Bread Loaf Test', cost: '2.1', price: '6', stock: '4', reorder: '3' });
  await addProduct(page, { business: 'Bakery', name: 'Cookie Pack Test', cost: '2.5', price: '7.5', stock: '18', reorder: '4' });
  await addProduct(page, { business: 'Craft', name: 'Spring Tumbler Test', cost: '6', price: '18', stock: '3', reorder: '2' });
  await addProduct(page, { business: 'Craft', name: 'Laser Sign Test', cost: '8', price: '24', stock: '4', reorder: '2' });
  await addProduct(page, { business: 'Craft', name: 'Towel Test', cost: '4', price: '12', stock: '15', reorder: '3' });

  await page.goto(`${baseUrl}/sale`);
  await page.waitForLoadState('networkidle');

  await runThreeItemReport(page, 'Bakery', [
    { name: 'Butter Tarts Test', qty: 1 },
    { name: 'Bread Loaf Test', qty: 2 },
    { name: 'Cookie Pack Test', qty: 3, overridePrice: '8' },
  ]);

  await runThreeItemReport(page, 'Crafts', [
    { name: 'Spring Tumbler Test', qty: 1 },
    { name: 'Laser Sign Test', qty: 2 },
    { name: 'Towel Test', qty: 3, overridePrice: '13' },
  ]);

  await addOrder(page);

  await page.goto(`${baseUrl}/inventory`);
  await page.waitForLoadState('networkidle');
  await expectText(page, 'Butter Tarts Test');
  await expectText(page, 'On hand 3 · Sold 1 · Reorder 3');
  await expectText(page, 'Bread Loaf Test');
  await expectText(page, 'On hand 2 · Sold 2 · Reorder 3');
  await expectText(page, 'Cookie Pack Test');
  await expectText(page, 'On hand 15 · Sold 3 · Reorder 4');
  await expectText(page, 'Spring Tumbler Test');
  await expectText(page, 'On hand 2 · Sold 1 · Reorder 2');
  await expectText(page, 'Laser Sign Test');
  await expectText(page, 'On hand 2 · Sold 2 · Reorder 2');
  await expectText(page, 'Towel Test');
  await expectText(page, 'On hand 12 · Sold 3 · Reorder 3');

  await page.goto(`${baseUrl}/summary`);
  await page.waitForLoadState('networkidle');
  await expectText(page, 'Bakery and Craft comparison');
  await expectText(page, 'Bakery');
  await expectText(page, '39.5 $');
  await expectText(page, 'Crafts');
  await expectText(page, '105 $');
  await expectText(page, 'Cookie Pack Test');
  await expectText(page, 'Towel Test');
  await expectText(page, 'Low stock');
  await expectText(page, 'Bakery');
  await expectText(page, 'Crafts');
  await expectText(page, 'Butter Tarts Test');
  await expectText(page, 'Bread Loaf Test');
  await expectText(page, 'Spring Tumbler Test');
  await expectText(page, 'Laser Sign Test');
  await expectText(page, 'Open orders');
  await expectText(page, 'Sarah');

  const persisted = await page.evaluate(() => JSON.parse(window.localStorage.getItem('darla-business-app.v1') || '{}'));
  assert.equal(persisted.products.length, 6, 'six products should be saved in the browser flow');
  assert.equal(persisted.sales.length, 6, 'six sales entries should be saved in the browser flow');
  assert.equal(persisted.orders.length, 1, 'one order should be saved for summary verification');

  console.log('Playwright summary flow passed: bakery and craft totals, best sellers, low stock, and open orders were all meaningful at a glance.');
  await browser.close();
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
  await page.waitForLoadState('networkidle');
  await expectText(page, 'Product saved.');
  await expectText(page, name);
}

async function runThreeItemReport(page, businessLabel, items) {
  await page.goto(`${baseUrl}/sale`);
  await page.waitForLoadState('networkidle');
  await page.getByText(businessLabel, { exact: true }).first().click();
  await expectText(page, 'Save Report Entry');

  for (const item of items) {
    await page.getByText(item.name, { exact: true }).first().click();
    await setQuantity(page, item.qty);

    if (item.overridePrice) {
      await page.getByText('Edit price only if needed', { exact: true }).click();
      const overrideField = page.locator('input').filter({ has: page.locator('input') });
      await page.locator('input').last().fill(item.overridePrice);
    }

    await page.getByRole('button', { name: 'Save Report Entry' }).click();
    await page.waitForLoadState('networkidle');
    await expectText(page, `${item.name} saved for`);
    await expectText(page, item.name);

    if (item.overridePrice) {
      await expectText(page, 'Edit price only if needed');
    }
  }
}

async function addOrder(page) {
  await page.goto(`${baseUrl}/orders`);
  await page.waitForLoadState('networkidle');
  const inputs = page.locator('input');
  await inputs.nth(0).fill('Sarah');
  await inputs.nth(1).fill('2 dozen butter tarts');
  await inputs.nth(2).fill('1');
  await inputs.nth(3).fill('28');
  await inputs.nth(4).fill('10');
  await inputs.nth(5).fill('2026-04-18');
  await page.getByRole('button', { name: 'Save Order' }).click();
  await page.waitForLoadState('networkidle');
  await expectText(page, 'Order saved.');
}

async function setQuantity(page, quantity) {
  const quantityInput = page.locator('input').nth(0);
  await quantityInput.fill(String(quantity));
}

async function expectText(page, text) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: 'visible', timeout: 10000 });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
