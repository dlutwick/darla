const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();

function loadTs(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  cache.set(file, module);
  function localRequire(request) {
    if (!request.startsWith('.')) return require(request);
    const base = path.resolve(path.dirname(file), request);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js')];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate.endsWith('.ts') || candidate.endsWith('.tsx') ? loadTs(candidate) : require(candidate);
      }
    }
    throw new Error(`Cannot resolve ${request} from ${file}`);
  }
  new Function('require', 'module', 'exports', '__filename', '__dirname', compiled)(localRequire, module, module.exports, file, path.dirname(file));
  return module.exports;
}

async function main() {
  const store = loadTs(path.join(root, 'src/features/business/store.ts'));

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

  const vendorPayment = await store.addExpense({
    date: '2026-04-22',
    month: '2026-04',
    expenseType: 'vendor-payment',
    expenseCategory: 'Vendor Payment',
    vendor: 'Donna',
    businessType: 'craft',
    amount: 30,
    note: 'verify-third-party-commission',
  });

  const snapshot = await store.getDashboardSnapshot();
  const createdOwnSale = snapshot.sales.find((row) => row.saleId === ownSale.saleId);
  const createdThirdPartySale = snapshot.sales.find((row) => row.saleId === thirdPartySale.saleId);

  if (!createdOwnSale || !createdThirdPartySale) {
    throw new Error('Test sales were not found in active snapshot.');
  }

  if (createdOwnSale.totalSale !== 40 || createdOwnSale.estimatedProfit !== 24) {
    throw new Error(`Own product math mismatch: expected total 40 and profit 24, got total ${createdOwnSale.totalSale} and profit ${createdOwnSale.estimatedProfit}.`);
  }

  if (createdThirdPartySale.totalSale !== 40 || createdThirdPartySale.commissionEarned !== 10 || createdThirdPartySale.vendorShare !== 30 || createdThirdPartySale.estimatedProfit !== 10) {
    throw new Error(`3rd-party math mismatch: expected total 40 / commission 10 / vendor 30 / earned 10, got total ${createdThirdPartySale.totalSale} / commission ${createdThirdPartySale.commissionEarned} / vendor ${createdThirdPartySale.vendorShare} / earned ${createdThirdPartySale.estimatedProfit}.`);
  }

  if (snapshot.monthMyProductSales < 40 || snapshot.monthThirdPartySales < 40 || snapshot.monthThirdPartyCommissionEarned < 10 || snapshot.monthVendorOwed < 30 || snapshot.monthVendorPaid < 30) {
    throw new Error('Monthly dashboard totals did not include expected third-party commission/vendor math.');
  }

  const candidates = await store.getThirdPartyConversionCandidates();
  if (!candidates.find((item) => item.productId === thirdParty.productId && item.vendorName === 'Donna')) {
    throw new Error('3rd-party conversion candidate detection missed the Donna product.');
  }

  await store.deleteExpense(vendorPayment.expenseId);
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
      vendorPaymentTrackedSeparately: true,
      conversionCandidateDetectionWorks: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
