const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();

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

function compileTs(source, file) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
    fileName: file,
  }).outputText;
}

function executeCompiled(compiled, file) {
  const module = { exports: {} };

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

function loadTs(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, 'utf8');
  const compiled = compileTs(source, file);
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

function loadMasterImportFromGit(ref) {
  const file = path.join(root, 'supabase/src/features/business/master-import-data.ts');
  const relative = path.relative(root, file);
  const source = execFileSync('git', ['--no-pager', 'show', '--no-ext-diff', '--no-textconv', `${ref}:${relative}`], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  return executeCompiled(compileTs(source, file), file).MASTER_IMPORT_STATE;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stable(value) {
  return JSON.stringify(value, Object.keys(JSON.parse(JSON.stringify(value))).sort());
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(actualJson === expectedJson, `${message}\nExpected: ${expectedJson}\nActual:   ${actualJson}`);
}

function sortByKey(items, key) {
  return [...items].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')));
}

function withoutFields(item, fields) {
  const next = { ...item };
  for (const field of fields) {
    delete next[field];
  }
  return next;
}

function snapshotNonPhyllisRuntimeData(state) {
  return {
    products: sortByKey(state.products.filter((product) => product.vendorName !== 'Phyllis'), 'productId').map((product) => withoutFields(product, [
      // Existing master-product migrations may refresh this metadata during a save.
      // Keep this verifier focused on substantive inventory/history changes.
      'updatedAt',
    ])),
    sales: sortByKey(state.sales, 'saleId').map((sale) => withoutFields(sale, [
      'priceOptionLabel',
      'priceOptionQuantity',
      'priceOptionTotalPrice',
    ])),
    expenses: sortByKey(state.expenses, 'expenseId'),
    giveaways: sortByKey(state.giveaways, 'giveawayId'),
    restocks: sortByKey(state.restocks, 'restockId'),
    orders: sortByKey(state.orders, 'orderId'),
    helperCommissions: sortByKey(state.helperCommissions, 'helperCommissionId'),
    inventoryPurchases: sortByKey(state.inventoryPurchases.filter((purchase) => purchase.vendorName !== 'Phyllis'), 'purchaseId'),
  };
}

function normalizeSeedForComparison(state) {
  return {
    products: (state.products ?? []).filter((product) => product.vendorName !== 'Phyllis'),
    sales: state.sales ?? [],
    expenses: state.expenses ?? [],
    giveaways: state.giveaways ?? [],
    restocks: state.restocks ?? [],
    orders: state.orders ?? [],
    helperCommissions: state.helperCommissions ?? [],
  };
}

const expectedProducts = [
  ['product-phyllis-sewing-tea-towels', 'Tea Towels', 'Sewing', 12, [{ label: '1 for $12', quantity: 1, totalPrice: 12 }, { label: '2 for $22', quantity: 2, totalPrice: 22 }]],
  ['product-phyllis-sewing-aprons-child', 'Aprons - Child', 'Sewing', 18, [{ label: '1 for $18', quantity: 1, totalPrice: 18 }]],
  ['product-phyllis-sewing-aprons-ladies', 'Aprons - Ladies', 'Sewing', 20, [{ label: '1 for $20', quantity: 1, totalPrice: 20 }]],
  ['product-phyllis-sewing-aprons-mens', "Aprons - Men's", 'Sewing', 30, [{ label: '1 for $30', quantity: 1, totalPrice: 30 }]],
  ['product-phyllis-sewing-trademark', 'Trademark', 'Sewing', 28, [{ label: '1 for $28', quantity: 1, totalPrice: 28 }]],
  ['product-phyllis-sewing-wreaths-seasonal', 'Wreaths - Seasonal', 'Sewing', 50, [{ label: 'Seasonal wreath - $50', quantity: 1, totalPrice: 50 }, { label: 'Seasonal wreath - $75', quantity: 1, totalPrice: 75 }]],
  ['product-phyllis-sewing-bowl-kozies-small', 'Bowl Kozies - Small', 'Sewing', 12, [{ label: '1 for $12', quantity: 1, totalPrice: 12 }]],
  ['product-phyllis-sewing-bowl-kozies-medium', 'Bowl Kozies - Medium', 'Sewing', 13, [{ label: '1 for $13', quantity: 1, totalPrice: 13 }]],
  ['product-phyllis-sewing-bowl-kozies-large', 'Bowl Kozies - Large', 'Sewing', 14, [{ label: '1 for $14', quantity: 1, totalPrice: 14 }]],
  ['product-phyllis-sewing-dog-handkerchief-small', 'Dog Handkerchief - Small', 'Sewing', 7, [{ label: '1 for $7', quantity: 1, totalPrice: 7 }]],
  ['product-phyllis-sewing-dog-handkerchief-medium', 'Dog Handkerchief - Medium', 'Sewing', 8, [{ label: '1 for $8', quantity: 1, totalPrice: 8 }]],
  ['product-phyllis-sewing-dog-handkerchief-large', 'Dog Handkerchief - Large', 'Sewing', 9, [{ label: '1 for $9', quantity: 1, totalPrice: 9 }]],
  ['product-phyllis-sewing-burlap-beehive-small', 'Burlap Beehive - Small', 'Sewing', 10, [{ label: '1 for $10', quantity: 1, totalPrice: 10 }]],
  ['product-phyllis-sewing-burlap-beehive-medium', 'Burlap Beehive - Medium', 'Sewing', 15, [{ label: '1 for $15', quantity: 1, totalPrice: 15 }]],
  ['product-phyllis-sewing-hair-scrunchies', 'Hair Scrunchies', 'Sewing', 6, [{ label: '1 for $6', quantity: 1, totalPrice: 6 }, { label: '2 for $10', quantity: 2, totalPrice: 10 }]],
  ['product-phyllis-christmas-decorations-angel-burlap', 'Angel - Burlap', 'Christmas Decorations', 6, [{ label: '1 for $6', quantity: 1, totalPrice: 6 }, { label: '2 for $10', quantity: 2, totalPrice: 10 }]],
  ['product-phyllis-christmas-decorations-gnomes', 'Gnomes', 'Christmas Decorations', 6, [{ label: '1 for $6', quantity: 1, totalPrice: 6 }, { label: '2 for $10', quantity: 2, totalPrice: 10 }]],
  ['product-phyllis-christmas-decorations-fabric-stars', 'Fabric Stars', 'Christmas Decorations', 6, [{ label: '1 for $6', quantity: 1, totalPrice: 6 }, { label: '2 for $10', quantity: 2, totalPrice: 10 }]],
  ['product-phyllis-christmas-decorations-candy-canes', 'Candy Canes', 'Christmas Decorations', 6, [{ label: '1 for $6', quantity: 1, totalPrice: 6 }, { label: '2 for $10', quantity: 2, totalPrice: 10 }]],
  ['product-phyllis-christmas-decorations-hand-embroidered-miniature-christmas-pillow', 'Hand-Embroidered Miniature Christmas Pillow', 'Christmas Decorations', 10, [{ label: '1 for $10', quantity: 1, totalPrice: 10 }]],
  ['product-phyllis-christmas-decorations-christmas-bows', 'Christmas Bows', 'Christmas Decorations', 4, [{ label: '1 for $4', quantity: 1, totalPrice: 4 }, { label: '2 for $7', quantity: 2, totalPrice: 7 }]],
];

const specialPricingProductIds = new Set([
  'product-phyllis-sewing-tea-towels',
  'product-phyllis-sewing-hair-scrunchies',
  'product-phyllis-christmas-decorations-angel-burlap',
  'product-phyllis-christmas-decorations-gnomes',
  'product-phyllis-christmas-decorations-fabric-stars',
  'product-phyllis-christmas-decorations-candy-canes',
  'product-phyllis-christmas-decorations-christmas-bows',
]);

async function verifySaleOption(store, product, option) {
  const unitPrice = Number((option.totalPrice / option.quantity).toFixed(2));
  const sale = await store.addSale({
    productId: product.productId,
    quantitySold: option.quantity,
    date: '2026-07-29',
    sellingPrice: unitPrice,
    priceOptionLabel: option.label,
    priceOptionQuantity: option.quantity,
    priceOptionTotalPrice: option.totalPrice,
    note: `Phyllis verification sale: ${product.name} ${option.label}`,
  });

  try {
    assert(sale.businessType === 'craft' && sale.businessLine === 'craft', `${product.name} sale should stay under Craft.`);
    assert(sale.productType === 'my-product', `${product.name} sale should stay as My Product inventory.`);
    assert(sale.vendorName === 'Phyllis', `${product.name} sale should carry Phyllis as vendor.`);
    assert(sale.productId === product.productId, `${product.name} sale should keep the Phyllis product id.`);
    assert(sale.category === product.category, `${product.name} sale should carry category ${product.category}.`);
    assert(sale.quantitySold === option.quantity, `${product.name} ${option.label} sale quantity is incorrect.`);
    assert(sale.unitPrice === unitPrice && sale.sellingPrice === unitPrice, `${product.name} ${option.label} sale unit price is incorrect.`);
    assert(sale.totalSale === option.totalPrice && sale.subtotal === option.totalPrice, `${product.name} ${option.label} sale total is incorrect.`);
    assert(sale.priceOptionLabel === option.label, `${product.name} ${option.label} sale option label was not recorded.`);
    assert(sale.priceOptionQuantity === option.quantity, `${product.name} ${option.label} sale option quantity was not recorded.`);
    assert(sale.priceOptionTotalPrice === option.totalPrice, `${product.name} ${option.label} sale option total was not recorded.`);
    assert(sale.costPerItem === 0, `${product.name} sale should not have an allocated item cost.`);
    assert(sale.costMissing === true, `${product.name} sale should be marked Cost Pending.`);
    assert(sale.estimatedProfit === 0 && sale.profit === 0, `${product.name} sale should not calculate individual profit yet.`);
  } finally {
    await store.deleteSale(sale.saleId);
  }
}

async function main() {
  console.log('Starting Phyllis inventory verification...');
  global.window = {
    localStorage: createLocalStorage(),
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };

  console.log('Loading current and previous seed data...');
  const currentSeed = loadTs(path.join(root, 'supabase/src/features/business/master-import-data.ts')).MASTER_IMPORT_STATE;
  const previousSeed = loadMasterImportFromGit('HEAD');
  assertDeepEqual(
    normalizeSeedForComparison(currentSeed),
    normalizeSeedForComparison(previousSeed),
    'Non-Phyllis seed data changed compared with HEAD.',
  );

  console.log('Loading business state...');
  const store = loadTs(path.join(root, 'supabase/src/features/business/store.ts'));
  const state = await store.loadBusinessState();
  const beforeRuntimeSnapshot = snapshotNonPhyllisRuntimeData(state);
  const phyllisProducts = state.products.filter((product) => product.vendorName === 'Phyllis');
  const productsById = new Map(phyllisProducts.map((product) => [product.productId, product]));

  console.log('Verifying products, categories, costs, and price options...');
  assert(phyllisProducts.length === 21, `Expected 21 Phyllis products, found ${phyllisProducts.length}.`);
  assert(phyllisProducts.every((product) => product.businessType === 'craft' && product.businessLine === 'craft'), 'Every Phyllis product must stay under Craft.');
  assert(phyllisProducts.every((product) => product.productType === 'my-product'), 'Phyllis products should remain My Product inventory.');
  assert(phyllisProducts.every((product) => product.vendorName === 'Phyllis'), 'Every Phyllis product must carry vendorName Phyllis.');
  assert(phyllisProducts.every((product) => product.cost === 0), 'Phyllis products should not have allocated item cost yet.');
  assert(phyllisProducts.every((product) => store.isProductCostMissing(product)), 'Every Phyllis product should be Cost Pending.');
  assert(phyllisProducts.every((product) => store.getProfitPerSellUnit(product) === 0), 'Every Phyllis product should have zero trusted per-unit profit for now.');
  assert(phyllisProducts.every((product) => product.status === 'active'), 'Phyllis products should be active.');

  const sewingProducts = phyllisProducts.filter((product) => product.category === 'Sewing');
  const christmasProducts = phyllisProducts.filter((product) => product.category === 'Christmas Decorations');
  assert(sewingProducts.length === 15, `Expected 15 Phyllis Sewing products, found ${sewingProducts.length}.`);
  assert(christmasProducts.length === 6, `Expected 6 Phyllis Christmas Decoration products, found ${christmasProducts.length}.`);
  assert(store.CRAFT_CATEGORIES.includes('Sewing'), 'Craft categories should include Sewing.');
  assert(store.CRAFT_CATEGORIES.includes('Christmas Decorations'), 'Craft categories should include Christmas Decorations.');

  for (const [productId, name, category, sellingPrice, priceOptions] of expectedProducts) {
    const product = productsById.get(productId);
    assert(product, `${name} product missing.`);
    assert(product.name === name, `${productId} name is incorrect.`);
    assert(product.category === category, `${name} category is incorrect.`);
    assert(product.sellingPrice === sellingPrice, `${name} selling price is incorrect.`);
    assertDeepEqual(product.priceOptions, priceOptions, `${name} price options are incorrect.`);
  }

  console.log('Verifying sale recording for saved price options...');
  for (const [productId, name, , , priceOptions] of expectedProducts) {
    const product = productsById.get(productId);
    assert(product, `${name} product missing before sale test.`);
    const optionsToTest = specialPricingProductIds.has(productId) ? priceOptions : priceOptions.slice(0, 1);
    for (const option of optionsToTest) {
      await verifySaleOption(store, product, option);
    }
  }

  console.log('Verifying temporary sales were cleaned up and non-Phyllis data stayed stable...');
  const afterRuntimeState = await store.loadBusinessState();
  assertDeepEqual(
    snapshotNonPhyllisRuntimeData(afterRuntimeState),
    beforeRuntimeSnapshot,
    'Non-Phyllis runtime data changed during the sale verification.',
  );
  assert(afterRuntimeState.sales.every((sale) => !String(sale.note ?? '').startsWith('Phyllis verification sale:')), 'A temporary Phyllis verification sale was left behind.');

  console.log('Verifying separate unallocated inventory purchase...');
  const purchase = afterRuntimeState.inventoryPurchases.find((item) => item.purchaseId === 'inventory-purchase-phyllis-20260729');
  assert(purchase, 'Separate Phyllis inventory purchase record missing.');
  assert(purchase.vendorName === 'Phyllis', 'Phyllis purchase vendor is incorrect.');
  assert(purchase.businessType === 'craft' && purchase.businessLine === 'craft', 'Phyllis purchase should be Craft.');
  assert(purchase.amount === 500, `Expected Phyllis purchase amount 500, got ${purchase.amount}.`);
  assert(purchase.allocationStatus === 'unallocated', 'Phyllis purchase should remain unallocated.');
  assert((purchase.notes ?? '').includes('Do not allocate to individual product cost/profit'), 'Phyllis purchase notes should keep the allocation warning.');

  console.log('Phyllis inventory verification passed.');
  console.log('- 21 Craft products verified.');
  console.log('- 15 Sewing and 6 Christmas Decorations products verified.');
  console.log('- Every selling price and saved price option verified.');
  console.log('- Special pricing sale path verified for all requested products.');
  console.log('- Temporary Phyllis test sales were deleted.');
  console.log('- $500 inventory purchase is separate and unallocated.');
  console.log('- Non-Phyllis seed/runtime sales, expenses, products, and history were unchanged.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
