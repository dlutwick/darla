import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:8081';

async function textOrNull(page, selector) {
  const locator = page.locator(selector).first();
  if (await locator.count()) {
    return (await locator.textContent())?.trim() ?? null;
  }
  return null;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = { steps: [] };

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);

  result.steps.push({ step: 'load-root', title: await page.title(), url: page.url() });

  const bodyText = await page.locator('body').innerText();
  result.steps.push({ step: 'body-sample', text: bodyText.slice(0, 1000), hasIndexArtifact: bodyText.includes('\nindex') || bodyText.endsWith('index') });

  const todayVisible = await page.getByText('Today', { exact: true }).count();
  result.steps.push({ step: 'today-tab-visible', count: todayVisible });

  const settingsVisible = await page.getByText('Settings', { exact: true }).count();
  result.steps.push({ step: 'settings-tab-visible', count: settingsVisible });

  if (settingsVisible) {
    await page.getByText('Settings', { exact: true }).click();
    await page.waitForTimeout(1500);
    result.steps.push({ step: 'after-settings-click', url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1000) });
  }

  const setupButtons = await page.getByText('Open target setup', { exact: true }).count();
  result.steps.push({ step: 'open-target-setup-visible', count: setupButtons });

  if (setupButtons) {
    await page.getByText('Open target setup', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    result.steps.push({ step: 'after-open-target-setup', url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1200) });
  }

  const saveTargetButtons = await page.getByText('Save targets', { exact: true }).count();
  result.steps.push({ step: 'save-targets-visible', count: saveTargetButtons });

  if (saveTargetButtons) {
    const inputs = page.locator('input');
    const totalInputs = await inputs.count();
    result.steps.push({ step: 'input-count', count: totalInputs });
    if (totalInputs >= 6) {
      await inputs.nth(0).fill('84.7');
      await inputs.nth(1).fill('68');
      await inputs.nth(2).fill('1200');
      await inputs.nth(3).fill('110');
      await inputs.nth(4).fill('80');
      await inputs.nth(5).fill('67');
      await page.getByText('Save targets', { exact: true }).click();
      await page.waitForTimeout(2000);
      result.steps.push({ step: 'after-save-targets', url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1200) });
    }
  }

  const weightTab = await page.getByText('Weight', { exact: true }).count();
  result.steps.push({ step: 'weight-tab-visible', count: weightTab });

  if (weightTab) {
    await page.getByText('Weight', { exact: true }).click();
    await page.waitForTimeout(1500);
    result.steps.push({ step: 'after-weight-click', url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1200) });
  }

  const logWeightButton = await page.getByText("Log today's weight", { exact: true }).count();
  result.steps.push({ step: 'log-weight-button-visible', count: logWeightButton });

  if (logWeightButton) {
    await page.getByText("Log today's weight", { exact: true }).click();
    await page.waitForTimeout(1500);
    result.steps.push({ step: 'after-log-weight-click', url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1200) });
  }

  const weightLabel = await page.getByText('Weight (lb)', { exact: true }).count();
  result.steps.push({ step: 'weight-label-visible', count: weightLabel });

  const saveWeightButtons = await page.getByText('Save weight', { exact: true }).count();
  result.steps.push({ step: 'save-weight-visible', count: saveWeightButtons });

  if (saveWeightButtons) {
    const inputs = page.locator('input');
    const totalInputs = await inputs.count();
    if (totalInputs >= 1) {
      await inputs.nth(0).fill('186.8');
      await page.getByText('Save weight', { exact: true }).click();
      await page.waitForTimeout(2000);
      result.steps.push({ step: 'after-save-weight', url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1200) });
    }
  }

  const saveBreakfastStarter = await page.getByText('Save Breakfast starter meal', { exact: true }).count();
  result.steps.push({ step: 'save-breakfast-starter-visible', count: saveBreakfastStarter });

  if (saveBreakfastStarter) {
    await page.goto(`${baseUrl}/today`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1500);
    await page.getByText('Save Breakfast starter meal', { exact: true }).click({ force: true });
    await page.waitForTimeout(2000);
    result.steps.push({ step: 'after-save-breakfast-starter', url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1500) });
  }

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: String(error), partial: result }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
