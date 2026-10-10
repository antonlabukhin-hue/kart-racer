import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// «Слово дня»: буква на бесконечной трассе засчитывается и копится; «Рекорды»: соперники и твоё место после заезда
test('слово дня и таблица рекордов', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('#mm-word-text')).toContainText('_');
    await page.locator('#mm-board').click();
    await expect(page.locator('.board-modal')).toContainText('Димон с Промзоны');
    await page.locator('.board-modal .bd-close').click();
    await expect(page.locator('.board-modal')).toHaveCount(0);

    await page.locator('#main-menu-play').click();
    await waitRacing(page);
    /* газ жмётся сам (W — прыжок) */
    // ближайшая буква впереди — машину на неё
    await expect.poll(() => page.evaluate(() => window.__raceDebug.collectibles.some(c => c.type === 'letter' && c.active)), { timeout: 20_000 }).toBe(true);
    // надпись «БУКВА» на медленной машине может сразу смениться другой — запоминаем сам факт появления
    await page.evaluate(() => { window.__sawLetter = false; new MutationObserver(() => { document.querySelectorAll('.penalty-pop, .big-plaque').forEach(function(p) { if (p.textContent.includes('БУКВА')) window.__sawLetter = true; }); /* буква — строкой сверху, без плашки на пол-экрана */ }).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    const got = await page.evaluate(async () => {
        const g = window.__raceDebug;
        const c = g.collectibles.filter(c => c.type === 'letter' && c.active && c.z < g.z - 3).sort((a, b) => b.z - a.z)[0];
        for (let i = 0; i < 20 && c.active; i++) { g.setStrikes(0); g.cars.forEach(car => { car.z = c.z - 300; car.mesh.position.z = car.z; }); g.setX(c.x); g.setZ(c.z + 0.2); await new Promise(r => setTimeout(r, 50)); }
        return JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].wordDay.got;
    });
    expect(got).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__sawLetter)).toBe(true);
    /* газ жмётся сам (W — прыжок) */
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('Место на неделе: #', { timeout: 20_000 });
    expect(problems).toEqual([]);
});
