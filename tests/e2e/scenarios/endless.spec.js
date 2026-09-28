import { test, expect } from '@playwright/test';
import { watchProblems, login, waitRacing, unlockBeastHour } from '../helpers.js';

// «Звериный час»: волна пройдена → карточка → следующая волна с накопленным счётом; авария → итог и рекорд
test('Звериный час: волны идут подряд, конец забега пишет рекорд', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    // до главы 1 карточка под замком и не запускает забег
    await expect(page.locator('.menu-card[data-menu="endless"]')).toHaveClass(/locked/);
    await page.locator('.menu-card[data-menu="endless"]').click({ force: true }); // aria-disabled — жмём как пользователь
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    await unlockBeastHour(page);
    await page.locator('.menu-card[data-menu="endless"]').click();
    await expect(page.locator('#endlessDisplay')).toContainText('ВОЛНА 1', { timeout: 20_000 });
    // забег по сиду дня: волна 1 идёт по раскладке из сида
    const seed = await page.evaluate(() => window.__endless && window.__endless.seed);
    expect(seed).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__endless.daily)).toBe(true);
    await waitRacing(page);
    await page.keyboard.down('w');
    await expect(page.locator('#endless-wave-card')).toContainText('ВОЛНА 2', { timeout: 60_000 });
    await expect(page.locator('#endless-wave-card .ew-seed')).toContainText('Звериный час дня');
    await expect(page.locator('#endlessDisplay')).toContainText('ВОЛНА 2', { timeout: 20_000 });
    const score = await page.locator('#endlessDisplay').textContent();
    expect(parseInt(score.split('·')[1], 10)).toBeGreaterThanOrEqual(1000);
    await page.keyboard.up('w');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('ЗВЕРИНЫЙ ЧАС ОКОНЧЕН', { timeout: 10_000 });
    await expect(page.locator('#finish-screen')).toContainText('НОВЫЙ РЕКОРД');
    await expect(page.locator('#finish-screen .finish-rank .fr-letter')).toHaveText('C'); // дожил до 2-й волны

    await page.locator('#finish-menu-btn').click();
    await expect(page.locator('#menu-endless-best')).toContainText('🏆');
    expect(problems).toEqual([]);
});
