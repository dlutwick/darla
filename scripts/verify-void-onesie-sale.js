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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: file,
  }).outputText;

  const module = { exports: {} };
  cache.set(file, module);

  function localRequire(request) {
    if (request === 'react-native') return { Platform: { OS: 'test' } };
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
  const exporter = loadTs(path.join(root, 'src/features/business/export.ts'));

  const product = await store.addProduct({
    businessType: 'craft',
    name: 'Baby Onesie Void Test',
    category: 'Sewing',
    cost: 3.75,
    sellingPrice: 15,
    sellUnitType: 'each',
    packSize: 1,
    startingInventory: 5,
    reorderLevel: 3,
    notes: 'verification',
  });

  const sale = await store.addSale({
    productId: product.productId,
    quantitySold: 1,
    date: '2026-06-08',
  });

  const before = await store.getDashboardSnapshot();
  if (!before.sales.some((item) => item.saleId === sale.saleId)) throw new Error('Test sale was not active before void.');
  const beforeJune = before.monthlySummaries.find((item) => item.month === '2026-06');
  const beforeProduct = before.productSnapshots.find((item) => item.productId === product.productId);
  if (!beforeJune || beforeJune.sales < sale.totalSale) throw new Error('June summary did not include the active Baby Onesie sale before void.');
  if (!beforeProduct || beforeProduct.quantitySold !== 1) throw new Error('Product totals did not include the active Baby Onesie sale before void.');

  const voided = await store.voidSale(sale.saleId);
  if (voided.status !== 'voided') throw new Error('voidSale did not mark the sale voided.');

  const afterVoid = await store.getDashboardSnapshot();
  if (afterVoid.sales.some((item) => item.saleId === sale.saleId)) throw new Error('Voided sale still appears in active sales.');
  if (!afterVoid.auditSales.some((item) => item.saleId === sale.saleId && item.status === 'voided')) throw new Error('Voided sale missing from audit history.');
  const afterJune = afterVoid.monthlySummaries.find((item) => item.month === '2026-06');
  const afterProduct = afterVoid.productSnapshots.find((item) => item.productId === product.productId);
  const beforeJuneSales = beforeJune?.sales ?? 0;
  const afterJuneSales = afterJune?.sales ?? 0;
  if (Number((beforeJuneSales - afterJuneSales).toFixed(2)) !== sale.totalSale) throw new Error('June sales total did not remove the voided Baby Onesie sale.');
  if (afterProduct?.quantitySold) throw new Error('Product totals still count the voided Baby Onesie sale.');

  const salesCsv = await exporter.buildSalesCsv();
  if (salesCsv.content.includes(sale.saleId) || salesCsv.content.includes('Baby Onesie Void Test')) throw new Error('Sales CSV still includes the voided Baby Onesie sale.');

  await store.deleteSale(sale.saleId);
  await store.deleteProduct(product.productId);

  console.log(JSON.stringify({
    ok: true,
    saleId: sale.saleId,
    productName: sale.productName,
    date: sale.date,
    juneSalesBeforeVoid: beforeJuneSales,
    juneSalesAfterVoid: afterJuneSales,
    activeAfterVoid: afterVoid.sales.some((item) => item.saleId === sale.saleId),
    inAuditAfterVoid: afterVoid.auditSales.some((item) => item.saleId === sale.saleId && item.status === 'voided'),
    inSalesCsvAfterVoid: salesCsv.content.includes('Baby Onesie Void Test'),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
