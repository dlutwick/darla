const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function main() {
  const requiredFiles = [
    'src/types/health.ts',
    'src/data/meal-slots.ts',
    'src/data/seeds/default-user-profile.ts',
    'src/data/seeds/dev-seed-bundle.ts',
    'src/data/repositories/health-repository.ts',
    'src/data/repositories/in-memory-health-repository.ts',
    'src/data/index.ts',
  ];

  requiredFiles.forEach((file) => {
    assert.ok(exists(file), `missing required Chunk 2 file: ${file}`);
  });

  const healthTypes = read('src/types/health.ts');
  const mealSlots = read('src/data/meal-slots.ts');
  const repoContract = read('src/data/repositories/health-repository.ts');
  const repoImpl = read('src/data/repositories/in-memory-health-repository.ts');

  assert.match(healthTypes, /export interface UserProfile/);
  assert.match(healthTypes, /export interface FoodItem/);
  assert.match(healthTypes, /export interface DailyLog/);
  assert.match(healthTypes, /export interface MealEntry/);
  assert.match(healthTypes, /export interface MealEntryItem/);
  assert.match(healthTypes, /export interface WeightEntry/);

  assert.match(mealSlots, /slotId: 'breakfast'/);
  assert.match(mealSlots, /slotId: 'lunch'/);
  assert.match(mealSlots, /slotId: 'supper'/);
  assert.match(mealSlots, /slotId: 'snack'/);

  assert.match(repoContract, /export interface HealthRepository/);
  assert.match(repoContract, /seedDevelopmentData/);
  assert.match(repoImpl, /export class InMemoryHealthRepository implements HealthRepository/);

  console.log('Chunk 2 smoke check passed');
}

main();
