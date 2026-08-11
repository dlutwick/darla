const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function createLoader() {
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
  return { loadTs };
}

function createLocalStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
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

async function main() {
  const storage = createLocalStorage();
  const listeners = new Map();
  let dispatchCount = 0;
  global.window = {
    localStorage: storage,
    dispatchEvent: (event) => {
      dispatchCount += 1;
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }
      return true;
    },
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type, listener) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== listener));
    },
  };
  global.CustomEvent = function CustomEvent(name) { this.type = name; };

  const { loadTs } = createLoader();
  const store = loadTs(path.join(root, 'supabase/src/features/business/store.ts'));
  const masterImportState = loadTs(path.join(root, 'supabase/src/features/business/master-import-data.ts')).MASTER_IMPORT_STATE;

  const legacySale = {
    businessType: 'bakery',
    businessLine: 'bakery',
    productType: 'my-product',
    productId: 'manual-old-row',
    productName: 'Old Imported Sale',
    itemName: 'Old Imported Sale',
    quantitySold: 2,
    quantity: 2,
    sellingPrice: 5,
    unitPrice: 5,
    date: '2026-04-22',
    totalSale: 10,
    subtotal: 10,
    category: 'Cookies',
    costPerItem: 2,
    estimatedProfit: 6,
    profit: 6,
    commissionPercent: 0,
    commissionEarned: 0,
    vendorShare: 0,
    createdAt: '2026-04-22T17:00:00.000Z'
  };
  const seedState = {
    ...masterImportState,
    sales: [
      legacySale,
      ...(masterImportState.sales ?? []),
    ],
  };

  storage.setItem(store.BUSINESS_STORAGE_KEY, JSON.stringify(seedState));

  const firstLoad = await store.loadBusinessState();
  const assignedSaleId = firstLoad.sales[0]?.saleId;
  if (!assignedSaleId) throw new Error('Expected missing saleId to be normalized and assigned.');

  const persistedAfterNormalization = JSON.parse(storage.getItem(store.BUSINESS_STORAGE_KEY));
  if (persistedAfterNormalization.sales[0].saleId !== assignedSaleId) {
    throw new Error('Expected normalized saleId to be persisted back to storage.');
  }

  const { loadTs: reloadTs } = createLoader();
  const reloadedStore = reloadTs(path.join(root, 'supabase/src/features/business/store.ts'));
  const afterRefresh = await reloadedStore.getSaleById(assignedSaleId);
  if (!afterRefresh) {
    throw new Error('Expected saved sale to be found again after simulated refresh.');
  }

  storage.clear();
  dispatchCount = 0;
  let subscriberCalls = 0;
  const { loadTs: regressionLoadTs } = createLoader();
  const regressionStore = regressionLoadTs(path.join(root, 'supabase/src/features/business/store.ts'));
  const unsubscribe = regressionStore.subscribeBusinessState(() => {
    subscriberCalls += 1;
  });

  await regressionStore.loadBusinessState();
  dispatchCount = 0;
  subscriberCalls = 0;
  await regressionStore.loadBusinessState();
  await regressionStore.loadBusinessState();
  await regressionStore.loadBusinessState();

  if (dispatchCount !== 0 || subscriberCalls !== 0) {
    throw new Error(`Expected repeated loadBusinessState calls to stay quiet after migrations, got ${dispatchCount} dispatches and ${subscriberCalls} subscriber calls.`);
  }

  dispatchCount = 0;
  subscriberCalls = 0;
  await regressionStore.addProduct({
    businessType: 'craft',
    productType: 'my-product',
    name: 'Subscription Regression Product',
    category: 'Sewing',
    cost: 1,
    sellingPrice: 2,
    vendorName: null,
    commissionPercent: 0,
    sellUnitType: 'each',
    customUnitName: null,
    packSize: 1,
    startingInventory: 0,
    reorderLevel: 0,
    notes: 'Created by verifier in fake storage only',
  });
  unsubscribe();

  if (dispatchCount !== 1 || subscriberCalls !== 1) {
    throw new Error(`Expected one store update to call the subscriber once, got ${dispatchCount} dispatches and ${subscriberCalls} subscriber calls.`);
  }

  console.log(JSON.stringify({
    ok: true,
    checks: {
      missingSaleIdsAreNormalized: true,
      normalizedSaleIdsArePersisted: true,
      savedSaleCanBeFoundAfterRefresh: true,
      repeatedBusinessStateLoadsDoNotDispatchAfterMigration: true,
      subscribersAreCalledOncePerBusinessStateUpdate: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
