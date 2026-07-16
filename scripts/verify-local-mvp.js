const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

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
    dump() {
      return Object.fromEntries(store.entries());
    },
  };
}

function createTsModuleLoader(projectRoot) {
  const cache = new Map();

  function resolveModule(fromFile, request) {
    if (!request.startsWith('.')) {
      return { type: 'node', id: request };
    }

    const base = path.resolve(path.dirname(fromFile), request);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.js`,
      `${base}.json`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.js'),
      path.join(base, 'index.json'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        if (candidate.endsWith('.ts')) {
          return { type: 'ts', id: candidate };
        }
        if (candidate.endsWith('.json')) {
          return { type: 'json', id: candidate };
        }
        return { type: 'node', id: candidate };
      }
    }

    throw new Error(`Could not resolve module '${request}' from ${fromFile}`);
  }

  function loadTsModule(filePath) {
    const normalized = path.resolve(filePath);
    if (cache.has(normalized)) {
      return cache.get(normalized).exports;
    }

    const source = fs.readFileSync(normalized, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: normalized,
      reportDiagnostics: false,
    }).outputText;

    const module = { exports: {} };
    cache.set(normalized, module);

    const localRequire = (request) => {
      const resolved = resolveModule(normalized, request);
      if (resolved.type === 'node') {
        if (resolved.id.startsWith(projectRoot)) {
          return loadTsModule(resolved.id);
        }
        return require(resolved.id);
      }
      if (resolved.type === 'json') {
        return JSON.parse(fs.readFileSync(resolved.id, 'utf8'));
      }
      return loadTsModule(resolved.id);
    };

    const wrapper = new Function('require', 'module', 'exports', '__filename', '__dirname', compiled);
    wrapper(localRequire, module, module.exports, normalized, path.dirname(normalized));
    return module.exports;
  }

  return {
    load(relPath) {
      return loadTsModule(path.join(projectRoot, relPath));
    },
  };
}

async function main() {
  const legacyLocalStorageKey = 'health-app.local-mvp.state.v1';
  const legacyState = {
    userProfile: {
      userId: 'darla',
      displayName: 'Darla',
      timezone: 'America/Moncton',
      targetMacroProteinPct: 35,
      targetMacroFatPct: 50,
      targetMacroCarbPct: 15,
      dailyCalorieTarget: 1200,
      proteinTargetG: 110,
      carbTargetG: 80,
      fatTargetG: 67,
      preferredWeighInDay: 'Sunday',
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-03-28T00:00:00.000Z'
    },
    mealSlotTemplates: [],
    foodItems: [],
    dailyLogs: [],
    mealEntries: [],
    mealEntryItems: [],
    weightEntries: [
      {
        weightEntryId: 'weight-2026-04-01',
        userId: 'darla',
        logDate: '2026-04-01',
        weightLb: 186.7,
        notes: 'Goal weight: 68 kg',
        createdAt: '2026-04-01T09:00:00.000Z',
        updatedAt: '2026-04-01T09:00:00.000Z'
      }
    ]
  };

  global.window = {
    localStorage: createLocalStorage({
      [legacyLocalStorageKey]: JSON.stringify(legacyState),
    }),
  };

  const loader = createTsModuleLoader(root);
  const onboarding = loader.load('src/features/onboarding/saveOnboarding.ts');
  const today = loader.load('src/features/today/today-log.ts');
  const walk = loader.load('src/features/today/walk-burn.ts');
  const weight = loader.load('src/features/weight/weight-log.ts');

  const migratedSnapshot = await onboarding.loadOnboardingSnapshot();
  assert.equal(migratedSnapshot.goalWeightKg, 68, 'legacy note-based goal weight should still load');

  await onboarding.saveOnboarding({
    currentWeightKg: 84.4,
    goalWeightKg: 67.1,
    calorieTarget: 1250,
    proteinTarget: 115,
    carbsTarget: 85,
    fatTarget: 65,
  });

  const breakfastBeforeSave = await today.loadTodaySnapshot();
  const breakfastFoods = breakfastBeforeSave.activeFoods.filter((food) => food.mealGroup === 'breakfast');
  const breakfastCategories = [...new Set(breakfastFoods.map((food) => food.foodCategory))];
  const breakfastSelection = breakfastCategories
    .map((category) => breakfastFoods.find((food) => food.foodCategory === category && food.easyDefault) || breakfastFoods.find((food) => food.foodCategory === category))
    .filter(Boolean)
    .map((food) => ({ foodId: food.foodId, quantityMultiplier: 1 }));

  assert.ok(breakfastSelection.length > 0, 'expected seeded breakfast foods to exist');

  const todayAfterMeal = await today.saveMealSelection({
    slotId: 'breakfast',
    selectedItems: breakfastSelection,
  });

  await walk.saveWalkMiles(1.5);
  const weightSnapshot = await weight.saveWeight({ weightLb: 184.2 });
  const onboardingSnapshot = await onboarding.loadOnboardingSnapshot();
  const activeTargets = await onboarding.loadActiveTargets();
  const todaySnapshot = await today.loadTodaySnapshot();

  assert.equal(onboardingSnapshot.goalWeightKg, 67.1, 'onboarding should reload structured goal weight');
  assert.equal(activeTargets.goalWeightKg, 67.1, 'settings-facing targets should use structured goal weight');
  assert.equal(weightSnapshot.latestWeight.weightLb, 184.2, 'latest weight should reflect saved value');
  assert.equal(todayAfterMeal.meals.find((meal) => meal.slotId === 'breakfast').items.length > 0, true, 'breakfast save should stick');
  assert.equal(todaySnapshot.log.walkMiles, 1.5, 'walk miles should persist on today snapshot');
  assert.ok(todaySnapshot.totals.calories > 0, 'today totals should include saved breakfast');
  assert.equal(todaySnapshot.burn.walkCalories, 150, 'walk burn should use local MVP estimate');
  assert.equal(todaySnapshot.remaining.calories, activeTargets.calories - todaySnapshot.burn.netCalories, 'remaining calories should stay internally consistent');

  const persistedState = JSON.parse(global.window.localStorage.getItem(legacyLocalStorageKey));
  assert.equal(persistedState.userProfile.goalWeightLb, 147.9, 'structured goal weight should persist to local state');
  assert.equal(
    persistedState.weightEntries.find((entry) => entry.logDate === weightSnapshot.logDate).notes,
    null,
    'active weight save path should no longer depend on note strings'
  );

  console.log('Local MVP verification passed: onboarding, breakfast, walk, weight, and reload snapshots stayed consistent.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
