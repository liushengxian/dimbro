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
  viewport: { width: 1440, height: 900 },
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
await page.screenshot({ path: '/tmp/dimbro-home.png' });

await page.getByRole('button', { name: /开始任务/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/dimbro-select.png' });

await page.getByRole('button', { name: /开始第 1 波/ }).click();
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/dimbro-battle.png' });

await page.keyboard.press('Escape');
await page.waitForTimeout(250);
await page.screenshot({ path: '/tmp/dimbro-pause.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

await page.evaluate(() => window.__dimbro?.finishWave());
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/dimbro-wave-clear.png' });

const upgradeButton = page.getByRole('button', { name: /进入回路升级/ });
if (await upgradeButton.count()) {
  await upgradeButton.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/dimbro-upgrade.png' });

  const cards = page.locator('.upgrade-card');
  if ((await cards.count()) > 0) {
    await cards.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/dimbro-shop.png' });
  }
}

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
