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
      'darla-business-app.v1': JSON.stringify({
        products: [
          {
            productId: 'roll-1',
            businessType: 'bakery',
            name: 'Cinnamon Rolls',
            category: 'Cinnamon Rolls',
            cost: 1.5,
            sellingPrice: 20,
            sellUnitType: 'pack',
            customUnitName: null,
            packSize: 10,
            startingInventory: 8,
            reorderLevel: 2,
            notes: null,
            batchSize: null,
            batchCost: null,
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z'
          }
        ],
        sales: [],
        expenses: [],
        orders: []
      })
    }),
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };

  const loader = createTsModuleLoader(root);
  const store = loader.load('src/features/business/store.ts');
  const exporter = loader.load('src/features/business/export.ts');

  const products = await store.listProducts('bakery');
  const cinnamonRolls = products.find((item) => item.name === 'Cinnamon Rolls');
  assert(cinnamonRolls, 'Cinnamon Rolls should exist');
  assert.equal(cinnamonRolls.sellUnitType, 'pack');
  assert.equal(cinnamonRolls.packSize, 4);
  assert.equal(cinnamonRolls.sellingPrice, 10);

  const sale = await store.addSale({ productId: cinnamonRolls.productId, quantitySold: 2, date: '2026-04-17' });
  assert.equal(sale.sellingPrice, 10);
  assert.equal(sale.totalSale, 20);
  assert.equal(store.getProductSellUnitDescription(sale), 'pack of 4');

  const dashboard = await store.getDashboardSnapshot();
  const recentSale = dashboard.sales.find((item) => item.productId === cinnamonRolls.productId);
  assert(recentSale, 'Recent sale should exist for Cinnamon Rolls');
  assert.equal(store.getProductSellUnitDescription(recentSale), 'pack of 4');

  const bestSeller = dashboard.bestSellingItems.find((item) => item.productId === cinnamonRolls.productId);
  assert(bestSeller, 'Best sellers should include Cinnamon Rolls after a sale');
  assert.equal(store.getProductSellUnitDescription(bestSeller), 'pack of 4');

  const productsCsv = await exporter.buildProductsCsv();
  assert(productsCsv.content.includes('Cinnamon Rolls,bakery,Cinnamon Rolls,pack of 4,4,1.5,10'), 'Products CSV should show Cinnamon Rolls as pack of 4 at $10');

  console.log('Cinnamon rolls verification passed: product setup, Add Sale, recent sales, best sellers, and CSV export all use pack of 4 at $10 per pack.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
