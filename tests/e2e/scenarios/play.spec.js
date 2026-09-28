import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

test('«▶ Играть»: новичок сразу в главе 1 — без магазина, качества и лора', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('#main-menu-play-sub')).toContainText('Глава 1');
    await page.locator('#main-menu-play').click();
    await waitRacing(page);
    expect(await page.evaluate(() => [window.__campaignIdx, window.__campaignTrackId])).toEqual([0, 'c01']);
    for (const id of ['#shop-screen', '#difficulty-screen', '#lore-screen', '#main-menu-screen']) {
        await expect(page.locator(id)).toBeHidden();
    }
    expect(problems).toEqual([]);
});
