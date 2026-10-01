import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// Ведущий-комментатор (src/announcer.js): реплика на старте и на важных моментах; «Молчит» в настройках — тишина
test('ведущий: реплика на старте и на рекорде, в настройках можно выключить', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await expect(page.locator('.announcer.in')).toBeVisible({ timeout: 8_000 }); // на обратном отсчёте
    await expect(page.locator('.announcer span')).not.toBeEmpty();
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toBeVisible({ timeout: 10_000 });
    // выключили — молчит
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('road_racing_settings_v1') || '{}'); s.host = 'off'; localStorage.setItem('road_racing_settings_v1', JSON.stringify(s)); });
    await page.locator('#finish-restart-btn').click();
    await waitRacing(page);
    await page.waitForTimeout(3000);
    await expect(page.locator('.announcer')).toHaveCount(0);
    expect(problems).toEqual([]);
});
