const fs = require('node:fs');
const assert = require('node:assert/strict');
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
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.json`, path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js')];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        if (candidate.endsWith('.ts') || candidate.endsWith('.tsx')) return { type: 'ts', id: candidate };
        if (candidate.endsWith('.json')) return { type: 'json', id: candidate };
        return { type: 'node', id: candidate };
      }
    }
    throw new Error(`Cannot resolve ${request} from ${fromFile}`);
  }

  function loadTs(file) {
    const normalized = path.resolve(file);
    if (cache.has(normalized)) return cache.get(normalized).exports;
    const source = fs.readFileSync(normalized, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
      fileName: normalized,
      reportDiagnostics: false,
    }).outputText;
    const module = { exports: {} };
    cache.set(normalized, module);
    function localRequire(request) {
      if (request === 'react-native') return { Platform: { OS: 'web' } };
      const resolved = resolveModule(normalized, request);
      if (resolved.type === 'json') return JSON.parse(fs.readFileSync(resolved.id, 'utf8'));
      if (resolved.type === 'ts') return loadTs(resolved.id);
      if (resolved.id.startsWith(projectRoot)) return loadTs(resolved.id);
      return require(resolved.id);
    }
    new Function('require', 'module', 'exports', '__filename', '__dirname', compiled)(localRequire, module, module.exports, normalized, path.dirname(normalized));
    return module.exports;
  }

  return { load(relPath) { return loadTs(path.join(projectRoot, relPath)); } };
}

async function main() {
  global.window = { localStorage: createLocalStorage(), dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
  global.CustomEvent = class CustomEvent {
    constructor(type, eventInitDict = {}) {
      this.type = type;
      this.detail = eventInitDict.detail;
    }
  };

  const loader = createTsModuleLoader(root);
  const store = loader.load('supabase/src/features/business/store.ts');
  const exporter = loader.load('supabase/src/features/business/export.ts');

  const historicalVendorPayment = {
    expenseId: 'verify-historical-vendor-payment',
    date: '2026-04-22',
    month: '2026-04',
    expenseType: 'vendor-payment',
    expenseCategory: 'Vendor Payment',
    vendor: 'Donna',
    businessType: 'craft',
    businessLine: 'craft',
    amount: 30,
    note: 'verify-third-party-commission historical row',
    status: 'active',
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-22T12:00:00.000Z',
  };

  window.localStorage.setItem(store.BUSINESS_STORAGE_KEY, JSON.stringify({
    products: [],
    sales: [],
    expenses: [historicalVendorPayment],
    giveaways: [],
    restocks: [],
    orders: [],
    helperCommissions: [],
  }));

  const myProduct = await store.addProduct({
    businessType: 'craft',
    name: 'Commission Test Own Product',
    category: 'Tumblers',
    productType: 'my-product',
    cost: 8,
    sellingPrice: 20,
    sellUnitType: 'each',
    packSize: 1,
    startingInventory: 5,
    reorderLevel: 1,
    notes: 'verify-third-party-commission',
  });

  const thirdParty = await store.addProduct({
    businessType: 'craft',
    name: 'Donna Commission Test Product',
    category: 'Tumblers',
    productType: 'third-party',
    cost: 0,
    sellingPrice: 20,
    vendorName: 'Donna',
    commissionPercent: 25,
    sellUnitType: 'each',
    packSize: 1,
    startingInventory: 5,
    reorderLevel: 1,
    notes: 'verify-third-party-commission',
  });

  const ownSale = await store.addSale({
    productId: myProduct.productId,
    quantitySold: 2,
    date: '2026-04-22',
  });

  const thirdPartySale = await store.addSale({
    productId: thirdParty.productId,
    quantitySold: 2,
    date: '2026-04-22',
  });

  await assert.rejects(
    () => store.addExpense({
      date: '2026-04-22',
      month: '2026-04',
      expenseType: 'vendor-payment',
      expenseCategory: 'Vendor Payment',
      vendor: 'Donna',
      businessType: 'craft',
      amount: 30,
      note: 'verify-third-party-commission',
    }),
    /New vendor payment expense rows are no longer supported/,
  );

  const snapshot = await store.getDashboardSnapshot();
  const createdOwnSale = snapshot.sales.find((row) => row.saleId === ownSale.saleId);
  const createdThirdPartySale = snapshot.sales.find((row) => row.saleId === thirdPartySale.saleId);
  const existingVendorPayment = snapshot.expenses.find((row) => row.expenseId === historicalVendorPayment.expenseId);

  if (!createdOwnSale || !createdThirdPartySale) {
    throw new Error('Test sales were not found in active snapshot.');
  }
  if (!existingVendorPayment) {
    throw new Error('Historical vendor-payment expense was not preserved in active expense history.');
  }

  if (createdOwnSale.totalSale !== 40 || createdOwnSale.estimatedProfit !== 24) {
    throw new Error(`Own product math mismatch: expected total 40 and profit 24, got total ${createdOwnSale.totalSale} and profit ${createdOwnSale.estimatedProfit}.`);
  }

  if (createdThirdPartySale.totalSale !== 40 || createdThirdPartySale.commissionEarned !== 10 || createdThirdPartySale.vendorShare !== 30 || createdThirdPartySale.estimatedProfit !== 10) {
    throw new Error(`3rd-party math mismatch: expected total 40 / commission 10 / vendor 30 / earned 10, got total ${createdThirdPartySale.totalSale} / commission ${createdThirdPartySale.commissionEarned} / vendor ${createdThirdPartySale.vendorShare} / earned ${createdThirdPartySale.estimatedProfit}.`);
  }

  const aprilSummary = snapshot.monthlySummaries.find((row) => row.month === '2026-04');
  if (!aprilSummary) {
    throw new Error('April monthly summary was missing.');
  }
  if (aprilSummary.myProductSales < 40 || aprilSummary.thirdPartySales < 40 || aprilSummary.thirdPartyCommissionEarned < 10 || aprilSummary.vendorOwed < 30 || aprilSummary.vendorPayments < 30) {
    throw new Error('April monthly totals did not include expected third-party commission/vendor math.');
  }
  if (aprilSummary.expenses < 30 || snapshot.craftExpensesOnly < 30) {
    throw new Error('Historical vendor-payment expenses were not included in business expense totals.');
  }

  const history = await exporter.getBusinessHistorySnapshot();
  if (history.counts.expenses < 1) {
    throw new Error('Expense history count did not include the historical vendor-payment expense.');
  }

  const expensesCsv = await exporter.buildExpensesCsv();
  if (!expensesCsv.content.includes('verify-historical-vendor-payment') && !expensesCsv.content.includes('vendor-payment,Vendor Payment,Donna')) {
    throw new Error('Historical vendor-payment expense was missing from expenses CSV export.');
  }

  const candidates = await store.getThirdPartyConversionCandidates();
  if (!candidates.find((item) => item.productId === thirdParty.productId && item.vendorName === 'Donna')) {
    throw new Error('3rd-party conversion candidate detection missed the Donna product.');
  }

  await store.deleteSale(ownSale.saleId);
  await store.deleteSale(thirdPartySale.saleId);
  await store.deleteProduct(myProduct.productId);
  await store.deleteProduct(thirdParty.productId);

  console.log(JSON.stringify({
    ok: true,
    checks: {
      ownProductProfitUsesFullSaleMinusCost: true,
      thirdPartyCommissionUsesPercent: true,
      vendorShareTrackedSeparately: true,
      newVendorPaymentCreationBlocked: true,
      historicalVendorPaymentIncludedInExpenseTotals: true,
      historicalVendorPaymentKeptInHistoryAndCsv: true,
      conversionCandidateDetectionWorks: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
