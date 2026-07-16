const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function requireMatch(source, regex, message) {
  assert.match(source, regex, message);
}

function main() {
  const breakfast = read('src/data/seeds/foods/breakfast.ts');
  const lunch = read('src/data/seeds/foods/lunch.ts');
  const supper = read('src/data/seeds/foods/supper.ts');
  const snack = read('src/data/seeds/foods/snack.ts');
  const bundle = read('src/data/seeds/dev-seed-bundle.ts');

  requireMatch(breakfast, /mealGroup: 'breakfast'/, 'breakfast foods missing');
  requireMatch(breakfast, /foodCategory: 'protein'/, 'breakfast protein missing');
  requireMatch(breakfast, /foodCategory: 'carb'/, 'breakfast carb missing');
  requireMatch(breakfast, /foodCategory: 'fat'/, 'breakfast fat missing');

  requireMatch(lunch, /mealGroup: 'lunch'/, 'lunch foods missing');
  requireMatch(lunch, /foodCategory: 'protein'/, 'lunch protein missing');
  requireMatch(lunch, /foodCategory: 'carb'/, 'lunch carb missing');
  requireMatch(lunch, /foodCategory: 'fat'/, 'lunch fat missing');
  requireMatch(lunch, /foodCategory: 'veggie'/, 'lunch veggie missing');

  requireMatch(supper, /mealGroup: 'supper'/, 'supper foods missing');
  requireMatch(supper, /foodCategory: 'protein'/, 'supper protein missing');
  requireMatch(supper, /foodCategory: 'carb'/, 'supper carb missing');
  requireMatch(supper, /foodCategory: 'fat'/, 'supper fat missing');
  requireMatch(supper, /foodCategory: 'veggie'/, 'supper veggie missing');

  requireMatch(snack, /mealGroup: 'snack'/, 'snack foods missing');
  requireMatch(snack, /foodCategory: 'protein'/, 'snack protein missing');
  requireMatch(snack, /foodCategory: 'fat'/, 'snack fat missing');

  requireMatch(bundle, /foodItems: seededFoodItems/, 'dev seed bundle is not wired to the seeded foods');

  console.log('Chunk 3 seed coverage check passed');
}

main();
