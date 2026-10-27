import { chromium } from 'playwright-core';

const executablePath =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.DIMBRO_URL ?? 'http://127.0.0.1:4173/';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu', '--hide-scrollbars'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(`${baseUrl}?debug=1`, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.setItem('dimbro.intro.v1', '1');
  localStorage.removeItem('dimbro.save.v1');
});
await page.reload({ waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/dimbro-home-1280.png' });

await page.getByRole('button', { name: /开始任务/ }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: '/tmp/dimbro-select-1280.png' });

const simonCard = page.getByRole('button', { name: /Simon/ }).first();
await simonCard.click();
await page.waitForTimeout(250);
await page.screenshot({ path: '/tmp/dimbro-select-simon-1280.png' });

const junyiCard = page.getByRole('button', { name: /Junyi/ }).first();
await junyiCard.click({ force: true });
await page.waitForTimeout(250);
const notice = await page.getByText(/尚未完成，暂时禁用/).count();
if (notice === 0) errors.push('Junyi disabled notice not shown');

await page.getByRole('button', { name: /开始第 1 波/ }).click();
await page.waitForTimeout(600);
const simonHud = page.locator('.battle-hud__repair');
if ((await simonHud.count()) === 0) errors.push('Simon repair shield HUD missing');
await page.screenshot({ path: '/tmp/dimbro-battle-simon-1280.png' });

// Pause -> home; verify continue and overwrite confirmation.
await page.keyboard.press('Escape');
await page.getByRole('button', { name: /返回首页/ }).click();
await page.waitForTimeout(300);
const continueButton = page.getByRole('button', { name: /继续任务/ });
if ((await continueButton.count()) === 0) errors.push('continue button missing');
await page.screenshot({ path: '/tmp/dimbro-home-with-save-1280.png' });

await page.getByRole('button', { name: /开始任务/ }).click();
const sunsetCard = page.getByRole('button', { name: /夕阳针/ }).first();
await sunsetCard.click();
await page.getByRole('button', { name: /开始第 1 波/ }).click();
await page.waitForTimeout(250);
const confirmDialog = page.getByRole('dialog');
if ((await confirmDialog.count()) === 0) {
  errors.push('overwrite confirmation missing');
} else {
  await page.screenshot({ path: '/tmp/dimbro-overwrite-1280.png' });
  await page.getByRole('button', { name: /覆盖并开始/ }).click();
  await page.waitForTimeout(500);
}

// Trigger RESET and verify the HUD countdown appears.
await page.evaluate(() => window.__dimbro?.triggerReset());
await page.waitForTimeout(250);
if ((await page.locator('.battle-hud__reset').count()) === 0) {
  errors.push('RESET HUD missing after debug trigger');
}
await page.screenshot({ path: '/tmp/dimbro-reset-1280.png' });

// Jump to boss, force phase 2 and soft enrage.
await page.evaluate(() => window.__dimbro?.jumpToWave(8));
await page.waitForTimeout(1800);
await page.evaluate(() => window.__dimbro?.setBossHp(0.49));
await page.waitForTimeout(500);
const bossPhase = await page.locator('.battle-hud__boss').getAttribute('data-phase');
if (bossPhase !== '2') errors.push(`boss phase expected 2, got ${bossPhase}`);
await page.screenshot({ path: '/tmp/dimbro-boss-phase2-1280.png' });

await page.evaluate(() => window.__dimbro?.setBossElapsed(61));
await page.waitForTimeout(500);
const enraged = await page.locator('.battle-hud__boss').getAttribute('data-enraged');
if (!enraged) errors.push('boss soft enrage indicator missing');
await page.screenshot({ path: '/tmp/dimbro-boss-enraged-1280.png' });

console.log(JSON.stringify({ errors, notice, bossPhase, enraged }, null, 2));
await browser.close();
