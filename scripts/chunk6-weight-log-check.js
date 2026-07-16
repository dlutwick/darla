const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function main() {
  const repoContract = read('src/data/repositories/health-repository.ts');
  const repoImpl = read('src/data/repositories/in-memory-health-repository.ts');
  const weightFeature = read('src/features/weight/weight-log.ts');
  const weightScreen = read('app/weight.tsx');

  assert.match(repoContract, /getWeightEntryByDate/);
  assert.match(repoContract, /upsertWeightEntry/);
  assert.match(repoImpl, /findIndex\(\(item\) => item\.logDate === entry\.logDate\)/);
  assert.match(weightFeature, /await repository\.upsertWeightEntry\(entry\)/);
  assert.match(weightScreen, /loadWeightSnapshot/);
  assert.match(weightScreen, /saveWeight/);
  assert.match(weightScreen, /Save weight/);

  console.log('Chunk 6 weight log check passed');
}

main();
