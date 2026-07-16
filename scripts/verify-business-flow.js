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
    localStorage: createLocalStorage(),
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };

  const loader = createTsModuleLoader(root);
  const store = loader.load('src/features/business/store.ts');

  const bakeryProducts = [
    await store.addProduct({ businessType: 'bakery', name: 'Butter Tarts', category: 'Butter Tarts', cost: 1.25, sellingPrice: 10.5, sellUnitType: 'pack', packSize: 3, startingInventory: 4, reorderLevel: 3, notes: 'Tray A' }),
    await store.addProduct({ businessType: 'bakery', name: 'Bread Loaf', category: 'Bread', cost: 2.1, sellingPrice: 6, sellUnitType: 'loaf', startingInventory: 4, reorderLevel: 3, notes: 'Weekly bake' }),
    await store.addProduct({ businessType: 'bakery', name: 'Cookies 6-Pack', category: 'Cookies', cost: 1.2, sellingPrice: 7.5, sellUnitType: 'pack', packSize: 6, startingInventory: 18, reorderLevel: 4, notes: 'Market pack' }),
  ];

  const craftProducts = [
    await store.addProduct({ businessType: 'craft', name: 'Spring Tumbler', category: 'Tumblers', cost: 6, sellingPrice: 18, sellUnitType: 'each', startingInventory: 3, reorderLevel: 2, notes: '16 oz' }),
    await store.addProduct({ businessType: 'craft', name: 'Laser Sign', category: 'Laser Crafts', cost: 8, sellingPrice: 24, sellUnitType: 'each', startingInventory: 4, reorderLevel: 2, notes: 'Shelf item' }),
    await store.addProduct({ businessType: 'craft', name: 'Seasonal Towel', category: 'Towels', cost: 4, sellingPrice: 12, sellUnitType: 'each', startingInventory: 15, reorderLevel: 3, notes: 'Gift item' }),
  ];

  const bakeryOnly = await store.listProducts('bakery');
  const craftOnly = await store.listProducts('craft');
  assert.equal(bakeryOnly.length, 3, 'bakery products should stay scoped to bakery sales entry');
  assert.equal(craftOnly.length, 3, 'craft products should stay scoped to craft sales entry');

  await store.addSale({ productId: bakeryProducts[0].productId, quantitySold: 1, date: '2026-04-16', note: 'Market sale' });
  await store.addSale({ productId: bakeryProducts[1].productId, quantitySold: 2, date: '2026-04-16', note: 'Market sale' });
  await store.addSale({ productId: bakeryProducts[2].productId, quantitySold: 3, date: '2026-04-16', note: 'Market sale', sellingPrice: 8 });

  await store.addSale({ productId: craftProducts[0].productId, quantitySold: 1, date: '2026-04-16', note: 'Market sale' });
  await store.addSale({ productId: craftProducts[1].productId, quantitySold: 2, date: '2026-04-16', note: 'Market sale' });
  await store.addSale({ productId: craftProducts[2].productId, quantitySold: 3, date: '2026-04-16', note: 'Market sale', sellingPrice: 13 });

  await store.addOrder({
    customerName: 'Sarah',
    businessType: 'bakery',
    itemOrdered: '2 dozen butter tarts',
    quantity: 1,
    price: 28,
    depositPaid: 10,
    dueDate: '2026-04-18',
    status: 'new',
    note: 'Saturday pickup',
  });

  const sales = await store.listSales();
  assert.equal(sales.length, 6, 'three bakery and three craft sales should be saved');

  const dashboard = await store.getDashboardSnapshot();
  const findSnapshot = (productId) => dashboard.productSnapshots.find((item) => item.productId === productId);

  assert.equal(findSnapshot(bakeryProducts[0].productId).quantityOnHand, 3, 'bakery inventory should drop after bakery report entry 1');
  assert.equal(findSnapshot(bakeryProducts[1].productId).quantityOnHand, 2, 'bakery inventory should drop after bakery report entry 2');
  assert.equal(findSnapshot(bakeryProducts[2].productId).quantityOnHand, 15, 'bakery inventory should drop after bakery report entry 3');
  assert.equal(findSnapshot(craftProducts[0].productId).quantityOnHand, 2, 'craft inventory should drop after craft report entry 1');
  assert.equal(findSnapshot(craftProducts[1].productId).quantityOnHand, 2, 'craft inventory should drop after craft report entry 2');
  assert.equal(findSnapshot(craftProducts[2].productId).quantityOnHand, 12, 'craft inventory should drop after craft report entry 3');

  assert.equal(dashboard.bakeryItemsSold, 6, 'bakery summary should total three saved report entries');
  assert.equal(dashboard.craftItemsSold, 6, 'craft summary should total three saved report entries');
  assert.equal(dashboard.bakerySales, 46.5, 'bakery sales should total three saved market sales, including override price');
  assert.equal(dashboard.craftSales, 105, 'craft sales should total three saved market sales, including override price');
  assert.equal(dashboard.bakeryBestSellingItems[0].productId, bakeryProducts[2].productId, 'bakery best sellers should rank the highest bakery quantity first');
  assert.equal(dashboard.craftBestSellingItems[0].productId, craftProducts[2].productId, 'craft best sellers should rank the highest craft quantity first');
  assert.equal(dashboard.lowStockItems.length, 4, 'summary should show meaningful low stock items across both businesses');
  assert.equal(dashboard.openOrders.length, 1, 'summary should include an open order when present');

  console.log('Business flow verification passed: summary data covered bakery, craft, best sellers, low stock, and open orders correctly.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
