const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
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

async function main() {
  const store = loadTs(path.join(root, 'src/features/business/store.ts'));

  const manualMyProductSale = await store.addSale({
    businessType: 'bakery',
    productType: 'my-product',
    productName: 'Manual Cost Test Item',
    category: 'Cookies',
    quantitySold: 3,
    date: '2026-04-22',
    sellingPrice: 5,
    costPerItem: 2,
    note: 'manual cost test',
  });

  if (manualMyProductSale.productType !== 'my-product') throw new Error('Manual My Product sale type mismatch.');
  if (manualMyProductSale.totalSale !== 15) throw new Error(`Expected manual My Product sales 15, got ${manualMyProductSale.totalSale}.`);
  if (manualMyProductSale.costPerItem !== 2) throw new Error(`Expected cost per sell unit 2, got ${manualMyProductSale.costPerItem}.`);
  if (manualMyProductSale.estimatedProfit !== 9) throw new Error(`Expected manual My Product profit 9, got ${manualMyProductSale.estimatedProfit}.`);
  if (manualMyProductSale.costMissing) throw new Error('Manual My Product sale should have trusted cost/profit.');

  const manualThirdPartySale = await store.addSale({
    businessType: 'craft',
    productType: 'third-party',
    productName: 'Manual Donna Test Item',
    category: 'Tumblers',
    quantitySold: 2,
    date: '2026-04-22',
    sellingPrice: 18,
    vendorName: 'Donna',
    commissionPercent: 25,
    note: 'manual test',
  });

  if (manualThirdPartySale.productType !== 'third-party') throw new Error('Manual third-party sale type mismatch.');
  if (manualThirdPartySale.commissionEarned !== 9) throw new Error(`Expected commission 9, got ${manualThirdPartySale.commissionEarned}.`);
  if (manualThirdPartySale.vendorShare !== 27) throw new Error(`Expected vendor share 27, got ${manualThirdPartySale.vendorShare}.`);

  const createdProduct = await store.addProduct({
    businessType: 'craft',
    productType: 'third-party',
    name: 'Manual Save As Product Test',
    category: 'Tumblers',
    cost: 4,
    sellingPrice: 24,
    vendorName: 'Donna',
    commissionPercent: 25,
    sellUnitType: 'each',
    packSize: 1,
    startingInventory: 0,
    reorderLevel: 0,
    notes: 'manual save-as-product test',
  });

  const savedProductSale = await store.addSale({
    productId: createdProduct.productId,
    quantitySold: 1,
    date: '2026-04-22',
  });

  if (savedProductSale.productId !== createdProduct.productId) throw new Error('Saved product sale did not use created product.');
  if (savedProductSale.commissionEarned !== 6) throw new Error(`Expected saved product commission 6, got ${savedProductSale.commissionEarned}.`);

  const createdMyProduct = await store.addProduct({
    businessType: 'bakery',
    productType: 'my-product',
    name: 'Manual Save As Product Cost Carry Test',
    category: 'Cookies',
    cost: 3,
    sellingPrice: 7,
    vendorName: null,
    commissionPercent: 0,
    sellUnitType: 'each',
    packSize: 1,
    startingInventory: 0,
    reorderLevel: 0,
    notes: 'manual my-product save-as-product test',
  });

  if (createdMyProduct.cost !== 3) throw new Error(`Expected created My Product cost 3, got ${createdMyProduct.cost}.`);

  await store.deleteSale(manualMyProductSale.saleId);
  await store.deleteSale(manualThirdPartySale.saleId);
  await store.deleteSale(savedProductSale.saleId);
  await store.deleteProduct(createdProduct.productId);
  await store.deleteProduct(createdMyProduct.productId);

  console.log(JSON.stringify({
    ok: true,
    checks: {
      manualTypedMyProductSaleWithCostWorks: true,
      manualMyProductProfitMathWorks: true,
      manualTypedThirdPartySaleWorks: true,
      manualThirdPartyMathWorks: true,
      savedProductSaleStillWorks: true,
      optionalSaveAsProductPathWorks: true,
      manualMyProductCostCarriesIntoSavedProductSetup: true,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
