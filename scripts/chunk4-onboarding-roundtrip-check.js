const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function main() {
  const onboardingSource = read('src/features/onboarding/saveOnboarding.ts');
  const repoSource = read('src/data/repositories/app-health-repository.ts');

  assert.match(repoSource, /getAppHealthRepository/);
  assert.match(onboardingSource, /await repository.saveUserProfile\(profile\)/);
  assert.match(onboardingSource, /await repository.upsertWeightEntry\(/);
  assert.match(onboardingSource, /export async function loadOnboardingSnapshot\(\)/);
  assert.match(onboardingSource, /export async function loadActiveTargets\(\)/);
  assert.doesNotMatch(onboardingSource, /requireSupabase/);
  assert.doesNotMatch(onboardingSource, /from\('macro_targets'\)/);

  console.log('Chunk 4 onboarding round-trip check passed');
}

main();
