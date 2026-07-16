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
  global.window = { localStorage: createLocalStorage(), dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
  const loader = createTsModuleLoader(root);
  const store = loader.load('src/features/business/store.ts');
  const exporter = loader.load('src/features/business/export.ts');

  const product = await store.addProduct({ businessType: 'bakery', name: 'Workbook Test Muffin', category: 'Cookies', cost: 2.5, sellingPrice: 8, startingInventory: 6, reorderLevel: 2 });
  const sale = await store.addSale({ productId: product.productId, quantitySold: 2, date: '2026-04-17', note: 'Workbook row' });
  const expense = await store.addExpense({ date: '2026-04-17', expenseCategory: 'Packaging', vendor: 'Dollar Store', businessType: 'bakery', amount: 12.5, note: 'Boxes' });

  assert.equal(sale.month, '2026-04');
  assert.equal(sale.itemName, 'Workbook Test Muffin');
  assert.equal(sale.quantity, 2);
  assert.equal(sale.unitPrice, 8);
  assert.equal(sale.subtotal, 16);
  assert.equal(sale.businessLine, 'bakery');
  assert.equal(sale.category, 'Cookies');
  assert.equal(sale.costPerItem, 2.5);
  assert.equal(sale.profit, sale.estimatedProfit);
  assert.equal(sale.notes, 'Workbook row');

  assert.equal(expense.month, '2026-04');
  assert.equal(expense.businessLine, 'bakery');
  assert.equal(expense.notes, 'Boxes');

  const salesCsv = await exporter.buildSalesCsv();
  const expensesCsv = await exporter.buildExpensesCsv();
  assert(salesCsv.content.includes('month,item_name,quantity,unit_price,subtotal,business_line,category,notes,cost_per_item,profit,date,sell_unit,pack_size'));
  assert(expensesCsv.content.includes('date,month,expense_category,vendor,business_line,amount,notes'));

  console.log('Spreadsheet alignment verification passed: sales rows, expense fields, and CSV headers match the workbook-style structure.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
