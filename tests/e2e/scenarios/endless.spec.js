import { test, expect } from '@playwright/test';
import { watchProblems, login } from '../helpers.js';

// «Звериный час»: волна пройдена → карточка → следующая волна с накопленным счётом; авария → итог и рекорд
test('Звериный час: волны идут подряд, конец забега пишет рекорд', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await page.locator('.menu-card[data-menu="endless"]').click();
    await expect(page.locator('#endlessDisplay')).toContainText('ВОЛНА 1', { timeout: 20_000 });
    await page.keyboard.down('w');
    await expect(page.locator('#endless-wave-card')).toContainText('ВОЛНА 2', { timeout: 60_000 });
    await expect(page.locator('#endlessDisplay')).toContainText('ВОЛНА 2', { timeout: 20_000 });
    const score = await page.locator('#endlessDisplay').textContent();
    expect(parseInt(score.split('·')[1], 10)).toBeGreaterThanOrEqual(1000);
    await page.keyboard.up('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state)).toBe('racing');
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('ЗВЕРИНЫЙ ЧАС ОКОНЧЕН', { timeout: 10_000 });
    await expect(page.locator('#finish-screen')).toContainText('НОВЫЙ РЕКОРД');

    await page.locator('#finish-menu-btn').click();
    await expect(page.locator('#menu-endless-best')).toContainText('🏆');
    expect(problems).toEqual([]);
});
