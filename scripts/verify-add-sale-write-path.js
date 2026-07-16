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
  const dateLib = loader.load('src/lib/date.ts');
  const today = dateLib.getLocalDay(new Date('2026-04-17T12:00:00-03:00'));

  const product = await store.addProduct({
    businessType: 'bakery',
    name: 'Debug Sale Test Muffin',
    category: 'Muffins',
    cost: 2.5,
    sellingPrice: 6,
    startingInventory: 12,
    reorderLevel: 3,
  });

  const sale = await store.addSale({
    productId: product.productId,
    quantitySold: 2,
    date: today,
  });

  const dashboard = await store.getDashboardSnapshot();

  assert.equal(sale.productName, 'Debug Sale Test Muffin');
  assert.equal(sale.quantitySold, 2);
  assert.equal(sale.totalSale, 12);
  assert.equal(dashboard.sales.length, 1);
  assert.equal(dashboard.todaySales, 12);
  assert.equal(dashboard.sales[0].saleId, sale.saleId);

  console.log(JSON.stringify({
    product: sale.productName,
    quantity: sale.quantitySold,
    saleAmount: sale.totalSale,
    salesRecordsFound: dashboard.sales.length,
    homeTodayTotal: dashboard.todaySales,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
