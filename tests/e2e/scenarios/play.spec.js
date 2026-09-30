import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

test('«▶ ПОЕХАЛИ»: сразу в бесконечную трассу — без витрины машин, качества и лора', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('#main-menu-play-sub')).toContainText('Бесконечная трасса');
    await page.locator('#main-menu-play').click();
    await waitRacing(page);
    await expect(page.locator('#infDisplay')).toContainText('м · Е');
    expect(await page.evaluate(() => window.__campaignTrackId)).toBeFalsy();
    for (const id of ['#shop-screen', '#difficulty-screen', '#lore-screen', '#main-menu-screen']) {
        await expect(page.locator(id)).toBeHidden();
    }
    expect(problems).toEqual([]);
});
