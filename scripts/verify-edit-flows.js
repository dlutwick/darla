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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
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
  const base = await store.getDashboardSnapshot();

  const product = await store.addProduct({
    businessType: 'bakery',
    name: 'Edit Flow Test Product',
    category: 'Cookies',
    cost: 1.25,
    sellingPrice: 5,
    sellUnitType: 'pack',
    packSize: 2,
    startingInventory: 10,
    reorderLevel: 2,
    notes: 'verification',
  });

  const updatedProduct = await store.updateProduct(product.productId, {
    businessType: 'craft',
    name: 'Edit Flow Test Product Updated',
    category: 'Tumblers',
    cost: 2,
    sellingPrice: 8,
    sellUnitType: 'each',
    customUnitName: null,
    packSize: 1,
    startingInventory: 12,
    reorderLevel: 3,
    notes: 'updated verification',
  });

  const sale = await store.addSale({
    productId: updatedProduct.productId,
    quantitySold: 2,
    date: '2026-04-21',
    sellingPrice: 8,
    note: 'before edit',
  });

  const editedSale = await store.updateSale(sale.saleId, {
    productId: updatedProduct.productId,
    quantitySold: 3,
    date: '2026-04-20',
    sellingPrice: 9,
    note: 'after edit',
  });

  const expense = await store.addExpense({
    date: '2026-04-21',
    month: '2026-04',
    expenseCategory: 'Supplies',
    vendor: 'Test Vendor',
    businessType: 'craft',
    amount: 10,
    note: 'expense before edit',
  });

  const editedExpense = await store.updateExpense(expense.expenseId, {
    date: '2026-04-19',
    month: '2026-04',
    expenseCategory: 'Equipment',
    vendor: 'Updated Vendor',
    businessType: 'craft',
    amount: 12.5,
    note: 'expense after edit',
  });

  const giveaway = await store.addGiveaway({
    productId: updatedProduct.productId,
    date: '2026-04-21',
    month: '2026-04',
    businessType: 'craft',
    category: 'Tumblers',
    quantityGivenAway: 1,
    estimatedSaleValue: 8,
    estimatedCost: 2,
    reason: 'before edit',
  });

  const editedGiveaway = await store.updateGiveaway(giveaway.giveawayId, {
    productId: updatedProduct.productId,
    date: '2026-04-18',
    month: '2026-04',
    businessType: 'craft',
    category: 'Tumblers Promo',
    quantityGivenAway: 2,
    estimatedSaleValue: 18,
    estimatedCost: 4,
    reason: 'after edit',
  });

  const afterEdits = await store.getDashboardSnapshot();

  if (afterEdits.sales.filter((item) => item.saleId === sale.saleId).length !== 1) throw new Error('Sale edit duplicated instead of updating.');
  if (afterEdits.expenses.filter((item) => item.expenseId === expense.expenseId).length !== 1) throw new Error('Expense edit duplicated instead of updating.');
  if (afterEdits.giveaways.filter((item) => item.giveawayId === giveaway.giveawayId).length !== 1) throw new Error('Giveaway edit duplicated instead of updating.');
  if ((await store.listProducts()).filter((item) => item.productId === product.productId).length !== 1) throw new Error('Product edit duplicated instead of updating.');
  if (!afterEdits.sales.find((item) => item.saleId === sale.saleId && item.totalSale === 27)) throw new Error('Sale totals did not recompute after edit.');
  if (!afterEdits.expenses.find((item) => item.expenseId === expense.expenseId && item.amount === 12.5)) throw new Error('Expense totals did not recompute after edit.');
  if (!afterEdits.giveaways.find((item) => item.giveawayId === giveaway.giveawayId && item.estimatedCost === 4)) throw new Error('Giveaway totals did not recompute after edit.');
  if (!afterEdits.productSnapshots.find((item) => item.productId === product.productId && item.quantityOnHand === 7)) throw new Error('Inventory-derived counts did not recompute after edits.');

  await store.deleteSale(sale.saleId);
  await store.deleteExpense(expense.expenseId);
  await store.deleteGiveaway(giveaway.giveawayId);
  await store.deleteProduct(product.productId);

  const afterDeletes = await store.getDashboardSnapshot();
  const finalProducts = await store.listProducts();
  if (afterDeletes.sales.some((item) => item.saleId === sale.saleId)) throw new Error('Sale delete failed.');
  if (afterDeletes.expenses.some((item) => item.expenseId === expense.expenseId)) throw new Error('Expense delete failed.');
  if (afterDeletes.giveaways.some((item) => item.giveawayId === giveaway.giveawayId)) throw new Error('Giveaway delete failed.');
  if (finalProducts.some((item) => item.productId === product.productId)) throw new Error('Product delete failed.');

  console.log(JSON.stringify({
    ok: true,
    baseCounts: {
      sales: base.sales.length,
      expenses: base.expenses.length,
      giveaways: base.giveaways.length,
      products: base.productSnapshots.length,
    },
    edited: {
      productName: updatedProduct.name,
      saleTotal: editedSale.totalSale,
      expenseAmount: editedExpense.amount,
      giveawayCost: editedGiveaway.estimatedCost,
      monthSales: afterEdits.monthSales,
      monthExpenses: afterEdits.monthExpenses,
      monthGiveawayCost: afterEdits.monthGiveawayCost,
    },
    cleanup: 'done',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
