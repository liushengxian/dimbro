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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
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
await page.waitForTimeout(300);
await page.evaluate(() => window.__dimbro?.finishWave());
await page.getByRole('button', { name: /进入回路升级/ }).click();
await page.locator('.upgrade-card').first().click();
await page.waitForTimeout(200);
await page.evaluate(() => window.__dimbro?.addCoins(1000));

// Buy new weapons until 4 slots are occupied.
for (let attempt = 0; attempt < 12; attempt += 1) {
  const state = await page.evaluate(() => {
    const snapshot = window.__dimbro?.snapshot();
    if (!snapshot?.shop || !snapshot.run) return null;
    return {
      slots: snapshot.run.weapons.length,
      offers: snapshot.shop.offers.map((offer, index) => ({
        index,
        kind: offer.kind,
        level: offer.level,
        name: offer.name,
        sold: offer.sold,
      })),
    };
  });
  if (!state) break;
  if (state.slots >= 4) break;
  const weaponOffer = state.offers.find(
    (offer) => offer.kind === 'weapon' && !offer.sold && offer.level === 1,
  );
  if (weaponOffer) {
    await page.locator('.shop-offer').nth(weaponOffer.index).click();
    await page.waitForTimeout(150);
    continue;
  }
  await page.getByRole('button', { name: /刷新/ }).click();
  await page.waitForTimeout(150);
}

// Refresh until the shop offers an unowned weapon, then trigger replacement.
let pendingIndex = -1;
for (let attempt = 0; attempt < 30; attempt += 1) {
  const state = await page.evaluate(() => {
    const snapshot = window.__dimbro?.snapshot();
    if (!snapshot?.shop || !snapshot.run) return null;
    const owned = new Set(snapshot.run.weapons.map((weapon) => weapon.id));
    return {
      slots: snapshot.run.weapons.length,
      offers: snapshot.shop.offers.map((offer, index) => ({
        index,
        kind: offer.kind,
        refId: offer.refId,
        sold: offer.sold,
      })),
      owned: [...owned],
    };
  });
  if (!state) break;
  if (state.slots < 4) errors.push(`weapon slots not full: ${state.slots}`);
  const candidate = state.offers.find(
    (offer) =>
      offer.kind === 'weapon' && !offer.sold && !state.owned.includes(offer.refId),
  );
  if (candidate) {
    pendingIndex = candidate.index;
    break;
  }
  await page.getByRole('button', { name: /刷新/ }).click();
  await page.waitForTimeout(150);
}

if (pendingIndex < 0) {
  errors.push('could not find an unowned weapon offer for replacement test');
} else {
  await page.locator('.shop-offer').nth(pendingIndex).click();
  await page.waitForTimeout(300);
  const dialog = page.getByRole('dialog');
  if ((await dialog.count()) === 0) {
    errors.push('replacement dialog missing');
  } else {
    await page.screenshot({ path: '/tmp/dimbro-replacement-1280.png' });
    const replaceButton = dialog.locator('.shop-screen__replace-slot:not([disabled])').first();
    if ((await replaceButton.count()) === 0) {
      errors.push('no replacement slot button');
    } else {
      await replaceButton.click();
      await page.waitForTimeout(300);
      if ((await page.getByRole('dialog').count()) > 0) {
        errors.push('replacement dialog did not close');
      }
    }
  }
}

// Sell a weapon and verify count drops.
const sellButton = page.locator('.shop-slot button').filter({ hasText: /出售/ }).first();
if ((await sellButton.count()) > 0) {
  await sellButton.click();
  await page.waitForTimeout(200);
  const sellDialog = page.getByRole('dialog');
  if ((await sellDialog.count()) > 0) {
    await sellDialog.getByRole('button', { name: /确认出售/ }).click();
    await page.waitForTimeout(300);
  } else {
    errors.push('sell confirmation missing');
  }
}

await page.screenshot({ path: '/tmp/dimbro-shop-final-1280.png' });
console.log(JSON.stringify({ errors, pendingIndex }, null, 2));
await browser.close();
