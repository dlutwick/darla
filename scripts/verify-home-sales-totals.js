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

  const bakery = await store.addProduct({ businessType: 'bakery', name: 'Bakery Flow Test', category: 'Bread', cost: 2, sellingPrice: 9, startingInventory: 10, reorderLevel: 2 });
  await store.addSale({ productId: bakery.productId, quantitySold: 1, date: '2026-04-16' });

  let dashboard = await store.getDashboardSnapshot();
  assert.equal(dashboard.bakerySales, 9, 'bakery sales on Home/Summary snapshot should reflect the saved bakery sale');
  assert.equal(dashboard.craftSales, 0, 'craft sales should still be zero before craft sale exists');

  const craft = await store.addProduct({ businessType: 'craft', name: 'Craft Flow Test', category: 'Tumblers', cost: 4, sellingPrice: 14, startingInventory: 10, reorderLevel: 2 });
  await store.addSale({ productId: craft.productId, quantitySold: 1, date: '2026-04-16' });

  dashboard = await store.getDashboardSnapshot();
  assert.equal(dashboard.bakerySales, 9, 'bakery sales should stay correct after adding craft data');
  assert.equal(dashboard.craftSales, 14, 'craft sales on Home/Summary snapshot should reflect the saved craft sale');

  const saved = JSON.parse(localStorage.getItem('darla-business-app.v1'));
  saved.sales[0] = {
    ...saved.sales[0],
    businessType: undefined,
  };
  localStorage.setItem('darla-business-app.v1', JSON.stringify(saved));

  dashboard = await store.getDashboardSnapshot();
  assert.equal(dashboard.bakerySales, 9, 'bakery sales should still resolve from saved sales data even when business type is missing on an older record');
  assert.equal(dashboard.craftSales, 14, 'craft sales should remain correct after bakery legacy fallback');

  console.log('Home sales total verification passed: bakery and craft sales update from saved sales entries and stay aligned with Summary data.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
