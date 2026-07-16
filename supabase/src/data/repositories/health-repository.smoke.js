const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const bundleSource = fs.readFileSync(path.join(root, 'src/data/seeds/dev-seed-bundle.ts'), 'utf8');

function main() {
  assert.match(bundleSource, /mealSlotTemplates/);
  assert.match(bundleSource, /foodItems: seededFoodItems/);
  assert.match(bundleSource, /userProfile: defaultUserProfile/);
  console.log('Chunk 2/3 repository smoke check passed');
}

main();
