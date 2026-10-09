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
    /* газ жмётся сам (W — прыжок) */
    await expect(page.locator('#endless-wave-card')).toContainText('ВОЛНА 2', { timeout: 60_000 });
    await expect(page.locator('#endless-wave-card .ew-seed')).toContainText('Звериный час дня');
    // у второй волны — своё правило; между волнами — выбор бонуса (src/wave-rules.js)
    await expect(page.locator('#endless-wave-card .ew-rule')).toBeVisible();
    await page.locator('#endless-wave-card .ew-pick[data-choice="double"]').click();
    await expect(page.locator('#endless-wave-card .ew-go')).toBeEnabled(); // бонус выбран — «Поехали»
    await page.locator('#endless-wave-card .ew-go').click();
    await expect(page.locator('#endlessDisplay')).toContainText('×2', { timeout: 20_000 });
    await expect(page.locator('#endlessDisplay')).toContainText('ВОЛНА 2', { timeout: 20_000 });
    const score = await page.locator('#endlessDisplay').textContent();
    expect(parseInt(score.split('·')[1], 10)).toBeGreaterThanOrEqual(1000);
    /* газ жмётся сам (W — прыжок) */
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('ЗВЕРИНЫЙ ЧАС ОКОНЧЕН', { timeout: 10_000 });
    await expect(page.locator('#finish-screen')).toContainText('НОВЫЙ РЕКОРД');
    await expect(page.locator('#finish-screen .finish-rank .fr-letter')).toHaveText('C'); // дожил до 2-й волны

    await page.locator('#finish-menu-btn').click();
    await expect(page.locator('#menu-endless-best')).toContainText('🏆');
    await expect(page.locator('#menu-endless-best')).toContainText('сегодня #1'); // «Звериный час дня» — в дневной таблице
    expect(problems).toEqual([]);
});

test('Звериный час: «В меню» на карточке волны — выход из забега в меню', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await unlockBeastHour(page);
    await page.locator('.menu-card[data-menu="endless"]').click();
    await waitRacing(page);
    /* газ жмётся сам (W — прыжок) */
    await expect(page.locator('#endless-wave-card')).toContainText('ВОЛНА 2', { timeout: 60_000 });
    /* газ жмётся сам (W — прыжок) */
    await page.locator('#endless-wave-card .ew-menu').click();
    await expect(page.locator('#endless-wave-card')).toHaveCount(0);
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    expect(await page.evaluate(() => [window.__inRace, !!window.__endless])).toEqual([false, false]);
    expect(problems).toEqual([]);
});
