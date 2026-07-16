const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function main() {
  const todayService = read('src/features/today/today-log.ts');
  const todayScreen = read('app/today.tsx');

  assert.match(todayService, /export async function loadTodaySnapshot/);
  assert.match(todayService, /export async function saveMealSelection/);
  assert.match(todayService, /await repository\.upsertMealEntry\(entry\)/);
  assert.match(todayService, /await repository\.replaceMealEntryItems\(entry\.mealEntryId, mealEntryItems\)/);
  assert.match(todayService, /remaining:/);

  assert.match(todayScreen, /loadTodaySnapshot/);
  assert.match(todayScreen, /saveMealSelection/);
  assert.match(todayScreen, /getGuidance/);
  assert.match(todayScreen, /getEncouragement/);
  assert.match(todayScreen, /quantityMultiplier: 1/);
  assert.match(todayScreen, /Add food/);
  assert.match(todayScreen, /handleQuickAddSave/);
  assert.match(todayScreen, /quickAddQuantity/);
  assert.match(todayScreen, /groupFoodsByCategory/);

  console.log('Chunk 5 Today loop check passed');
}

main();
