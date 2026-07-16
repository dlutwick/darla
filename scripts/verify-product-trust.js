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
  const dashboardBefore = await store.getDashboardSnapshot();

  const historyProduct = await store.addProduct({
    businessType: 'bakery',
    name: 'Archive Safety Product',
    category: 'Cookies',
    cost: 0,
    sellingPrice: 9,
    sellUnitType: 'pack',
    packSize: 3,
    startingInventory: 2,
    reorderLevel: 1,
    notes: 'archive-safety-test',
  });

  const sale = await store.addSale({
    productId: historyProduct.productId,
    quantitySold: 1,
    date: '2026-04-21',
    sellingPrice: 9,
    note: 'archive safety sale',
  });

  const safeDeleteProduct = await store.addProduct({
    businessType: 'craft',
    name: 'Delete Safe Product',
    category: 'Tumblers',
    cost: 4,
    sellingPrice: 12,
    sellUnitType: 'each',
    startingInventory: 1,
    reorderLevel: 1,
    notes: 'delete-safe-test',
  });

  await store.archiveProduct(historyProduct.productId);
  const activeProductsAfterArchive = await store.listProducts();
  const allProductsAfterArchive = await store.listProducts(undefined, { includeArchived: true });
  if (activeProductsAfterArchive.some((item) => item.productId === historyProduct.productId)) {
    throw new Error('Archived product still appears in active product selectors.');
  }
  if (!allProductsAfterArchive.some((item) => item.productId === historyProduct.productId && item.status === 'archived')) {
    throw new Error('Archived product missing from audit product list.');
  }

  let archivedSaleBlocked = false;
  try {
    await store.addSale({ productId: historyProduct.productId, quantitySold: 1, date: '2026-04-21' });
  } catch {
    archivedSaleBlocked = true;
  }
  if (!archivedSaleBlocked) throw new Error('Archived product should be blocked from new sale entry.');

  await store.restoreProduct(historyProduct.productId);
  const restoredProducts = await store.listProducts();
  if (!restoredProducts.some((item) => item.productId === historyProduct.productId)) {
    throw new Error('Restored product missing from active product selectors.');
  }

  const restock = await store.addRestock({
    productId: historyProduct.productId,
    date: '2026-04-21',
    month: '2026-04',
    quantityAdded: 2,
    note: 'restock proof',
  });
  if (restock.quantityBefore !== 1 || restock.quantityAfter !== 3) {
    throw new Error(`Unexpected restock before/after values: ${restock.quantityBefore} -> ${restock.quantityAfter}`);
  }

  const dashboardAfterRestock = await store.getDashboardSnapshot();
  const trackedProduct = dashboardAfterRestock.auditProductSnapshots.find((item) => item.productId === historyProduct.productId);
  if (!trackedProduct) throw new Error('Tracked product missing from audit snapshots.');
  if (!trackedProduct.costMissing || trackedProduct.costStatusLabel !== 'Cost Pending') {
    throw new Error('Cost Pending product flags are missing.');
  }
  if (trackedProduct.quantityOnHand !== 3) {
    throw new Error(`Expected on hand 3 after restock, got ${trackedProduct.quantityOnHand}.`);
  }

  let unsafeDeleteBlocked = false;
  try {
    await store.deleteProduct(historyProduct.productId);
  } catch {
    unsafeDeleteBlocked = true;
  }
  if (!unsafeDeleteBlocked) throw new Error('Product with history should not hard delete.');

  await store.deleteProduct(safeDeleteProduct.productId);
  await store.deleteRestock(restock.restockId);
  await store.deleteSale(sale.saleId);
  await store.deleteProduct(historyProduct.productId);

  const dashboardAfter = await store.getDashboardSnapshot();

  console.log(JSON.stringify({
    ok: true,
    checks: {
      archiveHidesFromSelectors: true,
      archiveRetainsAuditVisibility: true,
      archivedProductBlockedFromNewSale: true,
      restoreReturnsToSelectors: true,
      restockTracksBeforeAfter: true,
      costPendingFlagVisible: true,
      unsafeDeleteBlocked: true,
      safeDeleteAllowedWithoutHistory: true,
    },
    beforeActiveProducts: dashboardBefore.productSnapshots.length,
    afterActiveProducts: dashboardAfter.productSnapshots.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
