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
  };
}

async function main() {
  const storage = createLocalStorage();
  global.window = {
    localStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  global.CustomEvent = function CustomEvent(name) { this.type = name; };

  const { loadTs } = createLoader();
  const store = loadTs(path.join(root, 'src/features/business/store.ts'));

  const seedState = {
    products: [],
    sales: [
      {
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
      }
    ],
    expenses: [],
    giveaways: [],
    restocks: [],
    orders: []
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
  const reloadedStore = reloadTs(path.join(root, 'src/features/business/store.ts'));
  const afterRefresh = await reloadedStore.getSaleById(assignedSaleId);
  if (!afterRefresh) {
    throw new Error('Expected saved sale to be found again after simulated refresh.');
  }

  console.log(JSON.stringify({
    ok: true,
    checks: {
      missingSaleIdsAreNormalized: true,
      normalizedSaleIdsArePersisted: true,
      savedSaleCanBeFoundAfterRefresh: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
