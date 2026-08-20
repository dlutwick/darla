const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function createLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); },
  };
}

function createTsModuleLoader(projectRoot) {
  const cache = new Map();

  function resolveModule(fromFile, request) {
    if (!request.startsWith('.')) return { type: 'node', id: request };
    const base = path.resolve(path.dirname(fromFile), request);
    const candidates = [base, `${base}.ts`, `${base}.js`, `${base}.json`, path.join(base, 'index.ts'), path.join(base, 'index.js')];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        if (candidate.endsWith('.ts')) return { type: 'ts', id: candidate };
        if (candidate.endsWith('.json')) return { type: 'json', id: candidate };
        return { type: 'node', id: candidate };
      }
    }
    throw new Error(`Could not resolve module '${request}' from ${fromFile}`);
  }

  function loadTsModule(filePath) {
    const normalized = path.resolve(filePath);
    if (cache.has(normalized)) return cache.get(normalized).exports;
    const source = fs.readFileSync(normalized, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
      fileName: normalized,
      reportDiagnostics: false,
    }).outputText;
    const module = { exports: {} };
    cache.set(normalized, module);
    const localRequire = (request) => {
      if (request === 'react-native') return { Platform: { OS: 'web' } };
      const resolved = resolveModule(normalized, request);
      if (resolved.type === 'node') {
        if (resolved.id.startsWith(projectRoot)) return loadTsModule(resolved.id);
        return require(resolved.id);
      }
      if (resolved.type === 'json') return JSON.parse(fs.readFileSync(resolved.id, 'utf8'));
      return loadTsModule(resolved.id);
    };
    const wrapper = new Function('require', 'module', 'exports', '__filename', '__dirname', compiled);
    wrapper(localRequire, module, module.exports, normalized, path.dirname(normalized));
    return module.exports;
  }

  return { load(relPath) { return loadTsModule(path.join(projectRoot, relPath)); } };
}

async function main() {
  global.window = { localStorage: createLocalStorage(), dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
  const loader = createTsModuleLoader(root);
  const store = loader.load('supabase/src/features/business/store.ts');
  const exporter = loader.load('supabase/src/features/business/export.ts');

  assert.equal(store.AUTOMATIC_MONTHLY_EXPENSE_TOTAL, 94.30);
  assert.equal(store.getAutomaticMonthlyExpenseTotalForDate('2026-08-01'), 94.30);
  assert.equal(store.getAutomaticMonthlyExpenseTotalForDate('2026-09-01'), 146);

  const monthlyAutomatic = store.applyAutomaticExpensesToState({
    products: [],
    sales: [],
    expenses: [],
    giveaways: [],
    restocks: [],
    orders: [],
    helperCommissions: [],
  }, '2026-08-01');
  const monthlyRows = monthlyAutomatic.added.filter((expense) => expense.date === '2026-08-01' && String(expense.note).startsWith('Automatic monthly expense:'));
  assert.equal(monthlyRows.length, 3);
  assert.deepEqual(monthlyRows.map((expense) => expense.vendor).sort(), ['Craft Booth Fee', 'Fridge Fee', 'Tax']);
  assert.equal(Number(monthlyRows.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)), 94.30);

  const septemberAutomatic = store.applyAutomaticExpensesToState(monthlyAutomatic.state, '2026-09-01');
  const septemberRows = septemberAutomatic.added.filter((expense) => expense.date === '2026-09-01' && String(expense.note).startsWith('Automatic monthly expense:'));
  assert.equal(septemberRows.length, 1);
  assert.equal(septemberRows[0].vendor, 'Booth + Fridge Fee');
  assert.equal(septemberRows[0].expenseCategory, 'Event Fees');
  assert.equal(septemberRows[0].amount, 146);
  const preservedAugustRows = septemberAutomatic.state.expenses.filter((expense) => expense.date === '2026-08-01' && String(expense.note).startsWith('Automatic monthly expense:'));
  assert.equal(preservedAugustRows.length, 3);
  assert.deepEqual(preservedAugustRows.map((expense) => [expense.vendor, expense.amount]).sort(), [['Craft Booth Fee', 70], ['Fridge Fee', 12], ['Tax', 12.30]].sort());

  const marketAutomatic = store.applyAutomaticExpensesToState({
    products: [],
    sales: [],
    expenses: [],
    giveaways: [],
    restocks: [],
    orders: [],
    helperCommissions: [],
  }, '2026-07-18');
  const expectedMarketDates = ['2026-07-18'];
  const marketRows = marketAutomatic.added
    .filter((expense) => expense.vendor === store.HARTLAND_FARM_MARKET_FEE_VENDOR)
    .sort((a, b) => a.date.localeCompare(b.date));
  assert.deepEqual(marketRows.map((expense) => expense.date), expectedMarketDates);
  assert(marketRows.every((expense) => expense.amount === 25));
  assert(marketRows.every((expense) => expense.expenseCategory === 'Event Fees'));

  const removedSaturday = marketRows.find((expense) => expense.date === '2026-07-18');
  assert(removedSaturday, 'Expected 2026-07-18 Hartland fee to exist before removal test');
  const stateWithRemovedSaturday = {
    ...marketAutomatic.state,
    expenses: marketAutomatic.state.expenses.map((expense) => expense.expenseId === removedSaturday.expenseId
      ? { ...expense, status: 'voided', voidedAt: '2026-07-17T12:00:00.000Z' }
      : expense),
  };
  const afterRemovalRegeneration = store.applyAutomaticExpensesToState(stateWithRemovedSaturday, '2026-07-18');
  assert.equal(afterRemovalRegeneration.added.length, 0);
  const activeMarketDatesAfterRemoval = afterRemovalRegeneration.state.expenses
    .filter((expense) => expense.vendor === store.HARTLAND_FARM_MARKET_FEE_VENDOR && expense.status !== 'voided')
    .map((expense) => expense.date)
    .sort();
  assert(!activeMarketDatesAfterRemoval.includes('2026-07-18'));

  const beforeSnapshot = await store.getDashboardSnapshot();
  const beforeAprilExpenses = beforeSnapshot.monthlySummaries.find((item) => item.month === '2026-04')?.expenses ?? 0;

  const product = await store.addProduct({ businessType: 'bakery', name: 'Expense Test Cookies', category: 'Cookies', cost: 1.5, sellingPrice: 6, startingInventory: 12, reorderLevel: 3 });
  await store.addSale({ productId: product.productId, quantitySold: 2, date: '2026-04-17' });
  const expense = await store.addExpense({ date: '2026-04-17', expenseCategory: 'Packaging', vendor: 'Dollar Store', businessType: 'bakery', amount: 9.75, note: 'Boxes and bags' });

  const snapshot = await store.getDashboardSnapshot();
  const month = snapshot.monthlySummaries.find((item) => item.month === '2026-04');
  assert(month, 'Expected monthly summary for 2026-04');
  assert.equal(expense.month, '2026-04');
  assert(snapshot.monthExpenses >= 9.75);
  assert(snapshot.totalExpenses >= 9.75);
  assert.equal(month.expenses, Number((beforeAprilExpenses + 9.75).toFixed(2)));
  assert.equal(month.net, Number((month.profit - month.expenses).toFixed(2)));

  const history = await exporter.getBusinessHistorySnapshot();
  assert(history.counts.expenses >= 1);
  assert(snapshot.expenses.some((item) => item.expenseId === expense.expenseId && item.expenseCategory === 'Packaging'));

  const expensesCsv = await exporter.buildExpensesCsv();
  const summaryCsv = await exporter.buildSummaryCsv();
  assert(expensesCsv.content.includes('date,month,expense_type,expense_category,vendor,business_line,amount,notes'));
  assert(expensesCsv.content.includes('Hartland Farm Market'));
  assert(expensesCsv.content.includes('Event Fees'));
  assert(expensesCsv.content.includes('Craft Booth Fee'));
  assert(summaryCsv.content.includes('month_expenses,'));
  assert(summaryCsv.content.includes('month_net_after_expenses'));

  console.log('Expenses flow verification passed: historical recurring monthly expenses stay $94.30 through August 2026, September 2026 and future monthly booth/fridge total is $146, Hartland Saturday fees run through September 1, removed Saturdays do not regenerate, and dashboard/export totals include expense rows.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
