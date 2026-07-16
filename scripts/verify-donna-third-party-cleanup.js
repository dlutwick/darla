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
  const snapshot = await store.getDashboardSnapshot();
  const targets = ['Bird House-donna', 'Cutting Board -Farmhouse-donna'];
  const rows = snapshot.productSnapshots.filter((item) => targets.includes(item.name));

  if (rows.length !== 2) {
    throw new Error(`Expected 2 Donna products, found ${rows.length}.`);
  }

  for (const row of rows) {
    if (row.productType !== 'third-party') throw new Error(`${row.name} is not marked third-party.`);
    if (row.vendorName !== 'Donna') throw new Error(`${row.name} vendor is not Donna.`);
    if (row.commissionPercent !== 25) throw new Error(`${row.name} commission is not 25%.`);
  }

  console.log(JSON.stringify({
    ok: true,
    convertedProducts: rows.map((row) => ({
      name: row.name,
      productType: row.productType,
      vendorName: row.vendorName,
      commissionPercent: row.commissionPercent,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
