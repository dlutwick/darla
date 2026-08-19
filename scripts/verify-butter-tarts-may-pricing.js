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
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
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
  global.window = {
    localStorage: createLocalStorage({
      'darla-business-app.v2.master-import': JSON.stringify({
        products: [
          {
            productId: 'butter-1',
            businessType: 'bakery',
            businessLine: 'bakery',
            productType: 'my-product',
            name: 'Butter Tarts',
            category: 'Butter Tarts',
            cost: 0.57,
            sellingPrice: 10.5,
            sellUnitType: 'pack',
            customUnitName: null,
            packSize: 6,
            startingInventory: 30,
            reorderLevel: 3,
            notes: null,
            batchSize: null,
            batchCost: null,
            createdAt: '2026-04-29T12:00:00.000Z',
            updatedAt: '2026-04-29T12:00:00.000Z',
          },
          {
            productId: 'blueberry-1',
            businessType: 'bakery',
            businessLine: 'bakery',
            productType: 'my-product',
            name: 'Blueberry Tarts',
            category: 'Butter Tarts',
            cost: 0.57,
            sellingPrice: 10.5,
            sellUnitType: 'pack',
            customUnitName: null,
            packSize: 6,
            startingInventory: 30,
            reorderLevel: 3,
            notes: null,
            batchSize: null,
            batchCost: null,
            createdAt: '2026-04-29T12:00:00.000Z',
            updatedAt: '2026-04-29T12:00:00.000Z',
          },
          {
            productId: 'wrist-key-fob-1',
            businessType: 'craft',
            businessLine: 'craft',
            productType: 'my-product',
            name: 'Wrist Key fob',
            category: 'Gifts',
            cost: 1.1,
            sellingPrice: 12.5,
            sellUnitType: 'each',
            customUnitName: null,
            packSize: 1,
            startingInventory: 4,
            reorderLevel: 1,
            notes: null,
            batchSize: null,
            batchCost: null,
            createdAt: '2026-04-29T12:00:00.000Z',
            updatedAt: '2026-04-29T12:00:00.000Z',
          },
        ],
        sales: [
          {
            saleId: 'april-butter-sale',
            businessType: 'bakery',
            businessLine: 'bakery',
            productType: 'my-product',
            productId: 'butter-1',
            productName: 'Butter Tarts',
            month: '2026-04',
            itemName: 'Butter Tarts',
            sellUnitType: 'pack',
            customUnitName: null,
            packSize: 3,
            quantitySold: 2,
            quantity: 2,
            sellingPrice: 7,
            unitPrice: 7,
            date: '2026-04-30',
            note: null,
            notes: null,
            totalSale: 14,
            subtotal: 14,
            category: 'Butter Tarts',
            costPerItem: 2.06,
            estimatedProfit: 9.88,
            profit: 9.88,
            createdAt: '2026-04-30T12:00:00.000Z',
          },
          {
            saleId: 'saved-may-butter-sale',
            businessType: 'bakery',
            businessLine: 'bakery',
            productType: 'my-product',
            productId: 'butter-1',
            productName: 'Butter Tarts',
            month: '2026-05',
            itemName: 'Butter Tarts',
            sellUnitType: 'pack',
            customUnitName: null,
            packSize: 6,
            quantitySold: 7,
            quantity: 7,
            sellingPrice: 10.5,
            unitPrice: 10.5,
            date: '2026-05-30',
            note: null,
            notes: null,
            totalSale: 73.5,
            subtotal: 73.5,
            category: 'Butter Tarts',
            costPerItem: 0.57,
            estimatedProfit: 49.56,
            profit: 49.56,
            createdAt: '2026-05-30T12:00:00.000Z',
          },
        ],
        expenses: [],
        giveaways: [
          {
            giveawayId: 'wrist-key-fob-giveaway',
            businessType: 'craft',
            businessLine: 'craft',
            productId: 'wrist-key-fob-1',
            productName: 'Wrist Key fob',
            month: '2026-06',
            itemName: 'Wrist Key fob',
            sellUnitType: 'each',
            customUnitName: null,
            packSize: 1,
            quantityGivenAway: 1,
            quantity: 1,
            estimatedSaleValue: 12.5,
            estimatedCost: 1.1,
            date: '2026-06-01',
            note: null,
            notes: null,
            reason: null,
            category: 'Gifts',
            createdAt: '2026-06-01T12:00:00.000Z',
          },
        ],
        restocks: [],
        orders: [],
        helperCommissions: [],
      }),
    }),
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };

  const loader = createTsModuleLoader(root);
  const store = loader.load('src/features/business/store.ts');
  const exporter = loader.load('src/features/business/export.ts');

  const products = await store.listProducts('bakery');
  const butterTarts = products.find((item) => item.productId === 'butter-1');
  const blueberryTarts = products.find((item) => item.productId === 'blueberry-1');
  assert(butterTarts, 'Butter Tarts product should exist');
  assert(blueberryTarts, 'Blueberry Tarts product should exist');
  assert.equal(butterTarts.packSize, 6);
  assert.equal(butterTarts.sellingPrice, 10);
  assert.equal(blueberryTarts.sellingPrice, 10.5, 'Other tart products should keep their own price');

  const maySale = await store.addSale({ productId: butterTarts.productId, quantitySold: 3, date: '2026-05-01' });
  assert.equal(maySale.packSize, 6);
  assert.equal(maySale.unitPrice, 10);
  assert.equal(maySale.totalSale, 30);

  const craftProducts = await store.listProducts('craft');
  const wristKeyFob = craftProducts.find((item) => item.productId === 'wrist-key-fob-1');
  assert(wristKeyFob, 'Wrist Key fob product should exist');
  assert.equal(wristKeyFob.sellingPrice, 12);

  const fobSale = await store.addSale({ productId: wristKeyFob.productId, quantitySold: 1, date: '2026-06-13' });
  assert.equal(fobSale.unitPrice, 12);
  assert.equal(fobSale.totalSale, 12);
  assert.equal(fobSale.estimatedProfit, 10.9);

  const dashboard = await store.getDashboardSnapshot();
  const aprilSale = dashboard.sales.find((sale) => sale.saleId === 'april-butter-sale');
  assert(aprilSale, 'April butter tart sale should still be in history');
  assert.equal(aprilSale.packSize, 3);
  assert.equal(aprilSale.unitPrice, 7);
  assert.equal(aprilSale.totalSale, 14);

  const savedMaySale = dashboard.sales.find((sale) => sale.saleId === 'saved-may-butter-sale');
  assert(savedMaySale, 'Saved May butter tart sale should still be in history');
  assert.equal(savedMaySale.packSize, 6);
  assert.equal(savedMaySale.unitPrice, 10);
  assert.equal(savedMaySale.totalSale, 70);
  assert.equal(savedMaySale.estimatedProfit, 46.06);

  const dashboardFobSale = dashboard.sales.find((sale) => sale.saleId === fobSale.saleId);
  assert(dashboardFobSale, 'Dashboard should include sample Wrist Key fob sale');
  assert.equal(dashboardFobSale.unitPrice, 12);
  assert.equal(dashboardFobSale.totalSale, 12);

  const fobSnapshot = dashboard.productSnapshots.find((product) => product.productId === wristKeyFob.productId);
  assert(fobSnapshot, 'Product snapshot should include Wrist Key fob');
  assert.equal(fobSnapshot.sellingPrice, 12);
  assert.equal(fobSnapshot.quantitySold, 1);
  assert.equal(fobSnapshot.quantityGivenAway, 1);
  assert.equal(fobSnapshot.quantityOnHand, 2);

  const fobGiveaway = dashboard.giveaways.find((giveaway) => giveaway.giveawayId === 'wrist-key-fob-giveaway');
  assert(fobGiveaway, 'Dashboard should include Wrist Key fob giveaway');
  assert.equal(fobGiveaway.estimatedSaleValue, 12);

  const salesCsv = await exporter.buildSalesCsv();
  assert(salesCsv.content.includes('2026-04,Butter Tarts,my-product,,0,2,7,14'), 'Sales CSV should keep April butter tart sale at the old price');
  assert(salesCsv.content.includes('2026-05,Butter Tarts,my-product,,0,3,10,30'), 'Sales CSV should export May butter tart sale at $10');
  assert(salesCsv.content.includes('2026-05,Butter Tarts,my-product,,0,7,10,70'), 'Sales CSV should correct saved May pack-of-6 butter tart rows to $10');
  assert(salesCsv.content.includes('2026-06,Wrist Key fob,my-product,,0,1,12,12'), 'Sales CSV should export Wrist Key fob sale at $12');
  assert(salesCsv.content.includes('pack of 3,3'), 'Sales CSV should preserve the older pack of 3 sale');
  assert(salesCsv.content.includes('pack of 6,6'), 'Sales CSV should include the new pack of 6 sale');

  const productsCsv = await exporter.buildProductsCsv();
  assert(productsCsv.content.includes('Butter Tarts,bakery,my-product,,0,Butter Tarts,pack of 6,6,0.57,10'), 'Products CSV should export Butter Tarts package of 6 at $10');
  assert(productsCsv.content.includes('Wrist Key fob,craft,my-product,,0,Gifts,item,,1.1,12'), 'Products CSV should export Wrist Key fob at $12');

  const giveawaysCsv = await exporter.buildGiveawaysCsv();
  assert(giveawaysCsv.content.includes('2026-06-01,2026-06,Wrist Key fob,craft,Gifts,item,1,12,1.1'), 'Giveaways CSV should export Wrist Key fob value at $12');

  console.log('Pricing verification passed: Wrist Key fobs use $12, Butter Tarts pack-of-6 uses $10, sample sales calculate correctly, and dashboard/export paths are normalized.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
