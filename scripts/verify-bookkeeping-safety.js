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
  const before = await store.getDashboardSnapshot();

  const product = await store.addProduct({
    businessType: 'bakery',
    name: 'Safety Test Product',
    category: 'Cookies',
    cost: 0,
    sellingPrice: 12,
    sellUnitType: 'pack',
    packSize: 4,
    startingInventory: 5,
    reorderLevel: 2,
    notes: 'safety-test',
  });

  const missingCostSale = await store.addSale({
    productId: product.productId,
    quantitySold: 1,
    date: '2026-04-21',
    sellingPrice: 12,
    note: 'missing cost sale',
  });

  const restock = await store.addRestock({
    productId: product.productId,
    date: '2026-04-21',
    month: '2026-04',
    quantityAdded: 3,
    note: 'restock test',
  });

  const expense = await store.addExpense({
    date: '2026-04-21',
    month: '2026-04',
    expenseCategory: 'Supplies',
    vendor: 'Verifier',
    businessType: 'bakery',
    amount: 11,
    note: 'expense test',
  });

  const giveaway = await store.addGiveaway({
    productId: product.productId,
    date: '2026-04-21',
    month: '2026-04',
    businessType: 'bakery',
    category: 'Cookies',
    quantityGivenAway: 1,
    estimatedSaleValue: 12,
    estimatedCost: 0,
    reason: 'giveaway test',
  });

  let snapshot = await store.getDashboardSnapshot();
  const productSnapshot = snapshot.productSnapshots.find((item) => item.productId === product.productId);
  if (!productSnapshot) throw new Error('Product snapshot missing after setup.');
  if (missingCostSale.estimatedProfit !== 0) throw new Error('Missing-cost sale should not contribute profit.');
  if (!productSnapshot.costMissing) throw new Error('Product should be flagged as cost missing.');
  if (productSnapshot.quantityOnHand !== 6) throw new Error(`Expected on hand 6 after restock/sale/giveaway, got ${productSnapshot.quantityOnHand}.`);

  await store.voidSale(missingCostSale.saleId);
  await store.voidExpense(expense.expenseId);
  await store.voidGiveaway(giveaway.giveawayId);

  snapshot = await store.getDashboardSnapshot();
  if (snapshot.sales.some((item) => item.saleId === missingCostSale.saleId)) throw new Error('Voided sale still present in active sales.');
  if (snapshot.expenses.some((item) => item.expenseId === expense.expenseId)) throw new Error('Voided expense still present in active expenses.');
  if (snapshot.giveaways.some((item) => item.giveawayId === giveaway.giveawayId)) throw new Error('Voided giveaway still present in active giveaways.');
  if (!snapshot.auditSales.find((item) => item.saleId === missingCostSale.saleId && item.status === 'voided')) throw new Error('Voided sale missing from audit view.');
  if (!snapshot.auditExpenses.find((item) => item.expenseId === expense.expenseId && item.status === 'voided')) throw new Error('Voided expense missing from audit view.');
  if (!snapshot.auditGiveaways.find((item) => item.giveawayId === giveaway.giveawayId && item.status === 'voided')) throw new Error('Voided giveaway missing from audit view.');

  const afterVoidProduct = snapshot.productSnapshots.find((item) => item.productId === product.productId);
  if (!afterVoidProduct) throw new Error('Product snapshot missing after voids.');
  if (afterVoidProduct.quantityOnHand !== 8) throw new Error(`Expected on hand 8 after voiding sale and giveaway, got ${afterVoidProduct.quantityOnHand}.`);

  await store.restoreSale(missingCostSale.saleId);
  await store.restoreExpense(expense.expenseId);
  await store.restoreGiveaway(giveaway.giveawayId);

  snapshot = await store.getDashboardSnapshot();
  if (!snapshot.sales.find((item) => item.saleId === missingCostSale.saleId)) throw new Error('Restored sale missing from active sales.');
  if (!snapshot.expenses.find((item) => item.expenseId === expense.expenseId)) throw new Error('Restored expense missing from active expenses.');
  if (!snapshot.giveaways.find((item) => item.giveawayId === giveaway.giveawayId)) throw new Error('Restored giveaway missing from active giveaways.');

  await store.deleteSale(missingCostSale.saleId);
  await store.deleteExpense(expense.expenseId);
  await store.deleteGiveaway(giveaway.giveawayId);
  await store.deleteRestock(restock.restockId);
  await store.deleteProduct(product.productId);

  const after = await store.getDashboardSnapshot();

  console.log(JSON.stringify({
    ok: true,
    beforeCounts: { sales: before.sales.length, expenses: before.expenses.length, giveaways: before.giveaways.length },
    checks: {
      missingCostProfitExcluded: true,
      voidedRowsExcludedFromActiveTotals: true,
      voidedRowsAvailableInAuditHistory: true,
      restockAffectsInventory: true,
      restoredRowsReturnToActiveViews: true,
    },
    afterCounts: { sales: after.sales.length, expenses: after.expenses.length, giveaways: after.giveaways.length },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
