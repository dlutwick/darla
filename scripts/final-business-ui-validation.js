const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseUrl = process.env.BUSINESS_APP_BASE_URL || 'http://127.0.0.1:8082';
const storageKey = 'darla-business-app.v2.master-import';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    await page.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: 'networkidle', timeout: 120000 });
    await expectText(page, 'Market dashboard');

    let state = await getStoredState(page);
    const butterProduct = findProduct(state, 'Butter Tarts');
    const wristProduct = findProduct(state, 'Wrist Key fob');
    assert.equal(wristProduct.sellingPrice, 12, 'Wrist Key Fob product price should normalize to 12');
    assert.equal(butterProduct.sellingPrice, 10, 'Butter Tarts product price should normalize to 10');
    assert.equal(butterProduct.sellUnitType, 'pack', 'Butter Tarts should sell as packs');
    assert.equal(butterProduct.packSize, 6, 'Butter Tarts should display as a package of 6');

    await verifyPriceScreens(page);

    await addSavedProductSale(page, {
      business: 'Crafts',
      search: 'Wrist',
      productTitle: 'Wrist Key fob — item',
      unitPrice: '$12.00',
      saleTotal: '$12.00',
    });

    await addSavedProductSale(page, {
      business: 'Bakery',
      search: 'Butter',
      productTitle: 'Butter Tarts — pack of 6',
      unitPrice: '$10.00',
      saleTotal: '$10.00',
    });

    await page.goto(`${baseUrl}/today`, { waitUntil: 'networkidle', timeout: 120000 });
    await expectText(page, 'Butter Tarts — pack of 6');
    await expectText(page, '$10.00');
    await expectText(page, 'Wrist Key fob — item');
    await expectText(page, '$12.00');
    await expectText(page, '1 pack sold');
    await expectText(page, '1 item sold');

    state = await getStoredState(page);
    const wristSale = findSale(state, 'Wrist Key fob', 12);
    const butterSale = findSale(state, 'Butter Tarts', 10);
    assert.equal(wristSale.quantitySold, 1);
    assert.equal(wristSale.unitPrice, 12);
    assert.equal(wristSale.totalSale, 12);
    assert.equal(butterSale.quantitySold, 1);
    assert.equal(butterSale.unitPrice, 10);
    assert.equal(butterSale.totalSale, 10);
    assert.equal(butterSale.packSize, 6);

    await page.goto(`${baseUrl}/summary`, { waitUntil: 'networkidle', timeout: 120000 });
    await expectText(page, 'Monthly summary');
    await expectText(page, '$22.00');
    await expectText(page, 'Expenses');
    await expectText(page, 'Net');

    await page.goto(`${baseUrl}/inventory`, { waitUntil: 'networkidle', timeout: 120000 });
    await expectText(page, 'Butter Tarts');
    await expectText(page, 'pack of 6');
    await expectText(page, 'Sale price $10.00');
    await expectText(page, 'Wrist Key fob');
    await expectText(page, 'Sale price $12.00');

    await verifyExpenseUiAndDeletion(page);
    await verifyCsvExports(page);

    console.log('Final UI validation passed: pricing displays as $12.00/$10.00, requested sales total correctly in UI receipts/dashboard/summary/inventory/CSV, recurring expenses auto-post, Hartland Saturday deletion is isolated, and exports include the updated data.');
  } finally {
    await browser.close();
  }
}

async function addSavedProductSale(page, { business, search, productTitle, unitPrice, saleTotal }) {
  await page.goto(`${baseUrl}/sale`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByText(business, { exact: true }).first().click();
  await page.locator('input').first().fill(search);
  await page.getByText(productTitle, { exact: false }).first().click();
  await expectText(page, `Unit price: ${unitPrice}`);
  await expectText(page, `Sale total: ${saleTotal}`);
  await page.getByRole('button', { name: 'Save Sale Now' }).click();
  await page.waitForLoadState('networkidle');
  await expectText(page, 'sale saved successfully');
}

async function verifyPriceScreens(page) {
  await page.goto(`${baseUrl}/sale`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('input').first().fill('Butter');
  await expectText(page, 'Butter Tarts — pack of 6');
  await expectText(page, '$10.00 per pack');
  await page.getByText('Crafts', { exact: true }).first().click();
  await page.locator('input').first().fill('Wrist');
  await expectText(page, 'Wrist Key fob — item');
  await expectText(page, '$12.00 per sell unit');

  await page.goto(`${baseUrl}/bakery`, { waitUntil: 'networkidle', timeout: 120000 });
  await expectText(page, 'Butter Tarts');
  await expectText(page, 'Price $10.00');

  await page.goto(`${baseUrl}/crafts`, { waitUntil: 'networkidle', timeout: 120000 });
  await expectText(page, 'Wrist Key fob');
  await expectText(page, 'Price $12.00');

  await page.goto(`${baseUrl}/inventory`, { waitUntil: 'networkidle', timeout: 120000 });
  await expectText(page, 'Butter Tarts');
  await expectText(page, 'Sale price $10.00');
  await expectText(page, 'Wrist Key fob');
  await expectText(page, 'Sale price $12.00');
}

async function verifyExpenseUiAndDeletion(page) {
  await page.goto(`${baseUrl}/expenses`, { waitUntil: 'networkidle', timeout: 120000 });
  await expectText(page, 'Craft Booth Fee');
  await expectText(page, '$70.00');
  await expectText(page, 'Fridge Fee');
  await expectText(page, '$12.00');
  await expectText(page, 'Tax');
  await expectText(page, '$12.30');
  await expectText(page, '$25.00 per Saturday');
  await expectText(page, '2026-07-18 — $25.00');

  let state = await getStoredState(page);
  const monthlyRows = state.expenses.filter((expense) => (
    expense.date === '2026-06-01'
    && String(expense.note || '').startsWith('Automatic monthly expense:')
    && expense.status !== 'voided'
  ));
  assert.equal(Number(monthlyRows.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)), 94.30);
  assert.deepEqual(monthlyRows.map((expense) => expense.vendor).sort(), ['Craft Booth Fee', 'Fridge Fee', 'Tax']);

  const expectedMarketDates = ['2026-06-20', '2026-06-27', '2026-07-04', '2026-07-11', '2026-07-18', '2026-07-25', '2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29'];
  assert.deepEqual(getActiveMarketDates(state), expectedMarketDates);

  page.once('dialog', (dialog) => dialog.accept());
  const feeRow = page.locator('div').filter({ hasText: '2026-07-18 — $25.00' }).filter({ hasText: 'Remove' }).last();
  await feeRow.getByText('Remove', { exact: true }).click();
  await expectText(page, 'Future Saturday fees were not changed');

  state = await getStoredState(page);
  const activeMarketDates = getActiveMarketDates(state);
  assert(!activeMarketDates.includes('2026-07-18'));
  assert(activeMarketDates.includes('2026-07-25'));
  assert(activeMarketDates.includes('2026-08-29'));
}

async function verifyCsvExports(page) {
  await page.goto(`${baseUrl}/history`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByRole('button', { name: 'Export Sales CSV' }).click();
  await expectText(page, 'Latest export preview: sales.csv');
  let body = await page.locator('body').innerText();
  assert(body.includes('Butter Tarts'));
  assert(body.includes('Wrist Key fob'));
  assert(body.includes(',1,10,10,'));
  assert(body.includes(',1,12,12,'));

  await page.getByRole('button', { name: 'Export Expenses CSV' }).click();
  await expectText(page, 'Latest export preview: expenses.csv');
  body = await page.locator('body').innerText();
  assert(body.includes('Craft Booth Fee'));
  assert(body.includes('Fridge Fee'));
  assert(body.includes('Tax'));
  assert(body.includes('Hartland Farm Market'));
  assert(body.includes('Market Fees/Events'));

  await page.getByRole('button', { name: 'Export Summary CSV' }).click();
  await expectText(page, 'Latest export preview: summary.csv');
  body = await page.locator('body').innerText();
  assert(body.includes('month_expenses,'));
  assert(body.includes('month_net_after_expenses'));
}

async function getStoredState(page) {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), storageKey);
  assert(raw, 'Expected business app state in localStorage');
  return JSON.parse(raw);
}

function findProduct(state, name) {
  const product = state.products.find((item) => item.name.toLowerCase() === name.toLowerCase());
  assert(product, `Expected product ${name}`);
  return product;
}

function findSale(state, name, totalSale) {
  const sale = state.sales.find((item) => (
    item.status !== 'voided'
    && item.productName.toLowerCase() === name.toLowerCase()
    && Number(item.totalSale.toFixed(2)) === totalSale
  ));
  assert(sale, `Expected sale for ${name} totaling ${totalSale}`);
  return sale;
}

function getActiveMarketDates(state) {
  return state.expenses
    .filter((expense) => (
      expense.vendor === 'Hartland Farm Market'
      && expense.expenseCategory === 'Market Fees/Events'
      && Number(expense.amount.toFixed(2)) === 25
      && expense.status !== 'voided'
    ))
    .map((expense) => expense.date)
    .sort();
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
