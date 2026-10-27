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

await page.getByRole('button', { name: /开始任务/ }).click();
await page.getByRole('button', { name: /开始第 1 波/ }).click();
await page.waitForTimeout(500);

// Move to trigger light trail and give the auto-weapons some targets.
await page.keyboard.down('KeyD');
await page.waitForTimeout(900);
await page.keyboard.down('KeyW');
await page.waitForTimeout(900);
await page.keyboard.up('KeyW');
await page.keyboard.up('KeyD');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/dimbro-flow-battle-1280.png' });

const passiveText = await page.locator('.battle-hud').innerText();
if (!passiveText.includes('光轨追焦')) errors.push('light trail passive chip missing');

// Force wave end, choose the first upgrade, and enter shop.
await page.evaluate(() => window.__dimbro?.finishWave());
await page.getByRole('button', { name: /进入回路升级/ }).click();
await page.locator('.upgrade-card').first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/dimbro-flow-shop-1280.png' });

// Add coins and buy until equipment is full, then force a replacement.
await page.evaluate(() => window.__dimbro?.addCoins(300));
await page.waitForTimeout(150);
for (let attempt = 0; attempt < 24; attempt += 1) {
  if ((await page.locator('.shop-slot__name').count()) >= 4) break;
  const cards = page.locator(
    '.shop-offer[data-kind="weapon"]:not([data-sold]):not([disabled])',
  );
  if ((await cards.count()) === 0) {
    const refreshButton = page.getByRole('button', { name: /刷新/ });
    if (await refreshButton.count()) {
      await refreshButton.click();
      await page.waitForTimeout(150);
    }
    continue;
  }
  await cards.first().click();
  await page.waitForTimeout(120);
}
const slotsAfterBuy = await page.locator('.shop-slot__name').count();
if (slotsAfterBuy < 4) errors.push(`expected 4 equipped weapons, got ${slotsAfterBuy}`);

// Refresh and buy one more weapon to trigger replacement modal.
const refresh = page.getByRole('button', { name: /刷新/ });
if (await refresh.count()) {
  await refresh.click();
  await page.waitForTimeout(200);
}
const weaponCards = page.locator('.shop-offer[data-kind="weapon"]:not([data-sold]):not([disabled])');
if ((await weaponCards.count()) > 0) {
  await weaponCards.first().click();
  await page.waitForTimeout(200);
  if ((await page.getByRole('dialog').count()) > 0) {
    await page.screenshot({ path: '/tmp/dimbro-flow-replace-1280.png' });
    const replaceSlot = page.locator('.shop-screen .ui-modal .shop-slot').first();
    if (await replaceSlot.count()) {
      await replaceSlot.click();
    } else {
      const dialogButtons = page.getByRole('dialog').getByRole('button');
      if ((await dialogButtons.count()) > 1) await dialogButtons.nth(1).click();
    }
  }
}

// Next wave, then jump to boss for the final flow.
const nextWave = page.getByRole('button', { name: /进入下一波/ });
if (await nextWave.count()) {
  await nextWave.click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__dimbro?.jumpToWave(8));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: '/tmp/dimbro-flow-boss-1280.png' });
  await page.evaluate(() => window.__dimbro?.finishWave());
  await page.waitForTimeout(2600);
  await page.screenshot({ path: '/tmp/dimbro-flow-result-1280.png' });
}

// Save / continue smoke: start a new run, pause, go home, continue.
const resultHome = page.getByRole('button', { name: /返回首页/ });
if (await resultHome.count()) {
  await resultHome.click();
  await page.waitForTimeout(300);
}
const startAgain = page.getByRole('button', { name: /开始任务/ });
if (await startAgain.count()) {
  await startAgain.click();
  await page.getByRole('button', { name: /开始第 1 波/ }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /返回首页/ }).click();
  await page.waitForTimeout(300);
  const continueButton = page.getByRole('button', { name: /继续任务/ });
  if ((await continueButton.count()) === 0) {
    errors.push('continue button missing after returning home from a saved wave');
  } else {
    await continueButton.click();
    await page.waitForTimeout(600);
    const battleHud = page.locator('.battle-hud');
    if ((await battleHud.count()) === 0) errors.push('continue did not enter battle');
  }
}

console.log(JSON.stringify({ errors, slotsAfterBuy }, null, 2));
await browser.close();
