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
  const localStorage = createLocalStorage();
  global.window = {
    localStorage,
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };

  const loader = createTsModuleLoader(root);
  const store = loader.load('src/features/business/store.ts');
  const dateLib = loader.load('src/lib/date.ts');
  const today = dateLib.getLocalDay(new Date('2026-04-17T12:00:00-03:00'));
  const yesterday = dateLib.getLocalDay(new Date('2026-04-16T12:00:00-03:00'));

  const bakery = await store.addProduct({ businessType: 'bakery', name: 'Butter Tarts', category: 'Butter Tarts', cost: 2, sellingPrice: 9, sellUnitType: 'pack', packSize: 3, startingInventory: 10, reorderLevel: 2 });
  const craft = await store.addProduct({ businessType: 'craft', name: 'Craft Flow Test', category: 'Tumblers', cost: 4, sellingPrice: 14, startingInventory: 10, reorderLevel: 2 });

  const bakerySale = await store.addSale({ productId: bakery.productId, quantitySold: 2, date: today });
  const craftSale = await store.addSale({ productId: craft.productId, quantitySold: 3, date: today });
  await store.addSale({ productId: bakery.productId, quantitySold: 1, date: yesterday });

  assert.equal(bakerySale.productName, 'Butter Tarts');
  assert.equal(bakerySale.businessType, 'bakery');
  assert.equal(bakerySale.sellUnitType, 'pack');
  assert.equal(bakerySale.packSize, 3);
  assert.equal(bakerySale.quantitySold, 2);
  assert.equal(bakerySale.sellingPrice, 9);
  assert.equal(bakerySale.totalSale, 18);
  assert.equal(bakerySale.date, today);

  assert.equal(craftSale.productName, 'Craft Flow Test');
  assert.equal(craftSale.businessType, 'craft');
  assert.equal(craftSale.quantitySold, 3);
  assert.equal(craftSale.sellingPrice, 14);
  assert.equal(craftSale.totalSale, 42);
  assert.equal(craftSale.date, today);

  const dashboard = await store.getDashboardSnapshot();
  const recentBakerySale = dashboard.sales.find((sale) => sale.productId === bakery.productId);
  assert(recentBakerySale, 'recent sales should include the butter tarts sale');
  assert.equal(dashboard.sales.length, 3, 'saved sales records should be retained');
  assert.equal(dashboard.todaySales, 60, 'Home today total should use dollar totals for local-today sales only');
  assert.equal(dashboard.weekSales, 69, 'Home week total should include local week sales');
  assert.equal(dashboard.bakerySales, 27, 'Bakery card should sum bakery sale dollars');
  assert.equal(dashboard.craftSales, 42, 'Craft card should sum craft sale dollars');
  assert.equal(dashboard.bakeryItemsSold, 3, 'Bakery totals should count sell units sold');
  assert.equal(dashboard.sales.length, 3, 'recent sales list should be available from the same saved sales store');
  assert(dashboard.sales.slice(0, 2).some((sale) => sale.productName === 'Craft Flow Test'), 'recent sales should include the craft sale');
  assert(dashboard.sales.slice(0, 2).some((sale) => sale.productName === 'Butter Tarts'), 'recent sales should include the bakery sale');
  assert.equal(store.getProductSellUnitDescription(recentBakerySale), 'pack of 3', 'recent sales should reuse the saved product sell unit description');

  const bakerySection = await store.getBusinessSectionSnapshot('bakery');
  const craftSection = await store.getBusinessSectionSnapshot('craft');
  assert.equal(bakerySection.totalSales, 27, 'Summary bakery total should match Home bakery total');
  assert.equal(craftSection.totalSales, 42, 'Summary craft total should match Home craft total');

  console.log('Home sales flow verification passed: sale records save fully, local-date totals are correct, and Summary matches Home.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
