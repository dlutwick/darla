const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function createLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function createTsModuleLoader(projectRoot) {
  const cache = new Map();

  function resolveModule(fromFile, request) {
    if (!request.startsWith('.')) {
      return { type: 'node', id: request };
    }

    const base = path.resolve(path.dirname(fromFile), request);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.js`,
      `${base}.json`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.js'),
      path.join(base, 'index.json'),
    ];

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
    if (cache.has(normalized)) {
      return cache.get(normalized).exports;
    }

    const source = fs.readFileSync(normalized, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: normalized,
      reportDiagnostics: false,
    }).outputText;

    const module = { exports: {} };
    cache.set(normalized, module);

    const localRequire = (request) => {
      if (request === 'react-native') {
        return { Platform: { OS: 'web' } };
      }

      const resolved = resolveModule(normalized, request);
      if (resolved.type === 'node') {
        if (resolved.id.startsWith(projectRoot)) {
          return loadTsModule(resolved.id);
        }
        return require(resolved.id);
      }
      if (resolved.type === 'json') {
        return JSON.parse(fs.readFileSync(resolved.id, 'utf8'));
      }
      return loadTsModule(resolved.id);
    };

    const wrapper = new Function('require', 'module', 'exports', '__filename', '__dirname', compiled);
    wrapper(localRequire, module, module.exports, normalized, path.dirname(normalized));
    return module.exports;
  }

  return {
    load(relPath) {
      return loadTsModule(path.join(projectRoot, relPath));
    },
  };
}

async function main() {
  global.window = {
    localStorage: createLocalStorage({
      'darla-business-app.v1': JSON.stringify({
        products: [
          {
            productId: 'butter-1',
            businessType: 'bakery',
            name: 'Butter Tarts',
            category: 'Butter Tarts',
            cost: 1.25,
            sellingPrice: 7,
            sellUnitType: 'each',
            customUnitName: null,
            packSize: 1,
            startingInventory: 12,
            reorderLevel: 2,
            notes: null,
            batchSize: null,
            batchCost: null,
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z'
          },
          {
            productId: 'roll-1',
            businessType: 'bakery',
            name: 'Cinnamon Rolls',
            category: 'Cinnamon Rolls',
            cost: 1.5,
            sellingPrice: 20,
            sellUnitType: 'each',
            customUnitName: null,
            packSize: 1,
            startingInventory: 8,
            reorderLevel: 2,
            notes: null,
            batchSize: null,
            batchCost: null,
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z'
          }
        ],
        sales: [
          {
            saleId: 'sale-1',
            businessType: 'bakery',
            productId: 'butter-1',
            productName: 'Butter Tarts',
            sellUnitType: 'each',
            customUnitName: null,
            packSize: 1,
            quantitySold: 1,
            sellingPrice: 7,
            date: '2026-04-17',
            note: null,
            totalSale: 7,
            estimatedProfit: 3.25,
            createdAt: '2026-04-17T00:00:00.000Z'
          }
        ],
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
  const butterTarts = products.find((item) => item.name === 'Butter Tarts');
  const cinnamonRolls = products.find((item) => item.name === 'Cinnamon Rolls');

  assert(butterTarts, 'Butter Tarts should exist');
  assert(cinnamonRolls, 'Cinnamon Rolls should exist');
  assert.equal(butterTarts.sellUnitType, 'pack');
  assert.equal(butterTarts.packSize, 3);
  assert.equal(cinnamonRolls.sellUnitType, 'pack');
  assert.equal(cinnamonRolls.packSize, 4);
  assert.equal(cinnamonRolls.sellingPrice, 10);

  const dashboard = await store.getDashboardSnapshot();
  const recentSale = dashboard.sales.find((sale) => sale.productId === 'butter-1');
  assert(recentSale, 'Recent sale should exist');
  assert.equal(store.getProductSellUnitDescription(recentSale), 'pack of 3');
  assert.equal(store.getProductSellUnitLabel(recentSale, 1), 'pack');

  const salesCsv = await exporter.buildSalesCsv();
  assert(salesCsv.content.includes('pack of 3'), 'Sales CSV should include pack of 3 for butter tarts');

  const productsCsv = await exporter.buildProductsCsv();
  assert(productsCsv.content.includes('Butter Tarts,bakery,Butter Tarts,pack of 3,3'), 'Products CSV should include corrected pack settings');
  assert(productsCsv.content.includes('Cinnamon Rolls,bakery,Cinnamon Rolls,pack of 4,4,1.5,10'), 'Products CSV should include corrected cinnamon rolls pack and price settings');

  console.log('Packaged bakery setup verification passed: legacy bakery item records migrate to the corrected pack settings and display/export as packs.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
