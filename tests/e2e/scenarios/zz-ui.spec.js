import { test } from '@playwright/test';
import { login } from '../helpers.js';
const O = process.env.OUT;
test('ui tour', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page);
    const shot = async (n) => { await page.waitForTimeout(1100); await page.screenshot({ path: O + '/' + n + '.png' }); };
    await shot('01_main');
    const back = async () => { await page.goto('./'); await page.locator('#splash-screen').click(); await page.locator('#profile-list').getByText('Тестер').click(); };
    for (const [n, sel] of [['02_campaign', '.menu-card[data-menu="campaign"]'], ['03_garage', '.menu-card[data-menu="garage"]'], ['04_rewards', '.menu-card[data-menu="rewards"]'], ['05_events', '.menu-card[data-menu="events"]'], ['06_shop', '#main-menu-shop']]) {
        await page.locator(sel).click();
        await shot(n);
        await back();
    }
    await page.locator('.menu-card[data-menu="race"]').click();
    const shop = page.locator('#shop-action'); if (await shop.isVisible()) await shop.click();
    await shot('09_difficulty');
    await page.locator('.difficulty-btn[data-diff="easy"]').click();
    await page.waitForTimeout(800);
    const skip = page.getByRole('button', { name: /Пропустить/ });
    if (await skip.isVisible()) { await shot('10_lore'); await skip.click(); }
    await shot('11_mapselect');
});
