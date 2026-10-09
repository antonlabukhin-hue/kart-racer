import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// Победа сохраняет призрака; на «Заново» он едет по трассе рядом с игроком
test('призрак: после победы на следующем заезде едет запись лучшего', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.ghost), { timeout: 10_000 }).toBeNull();
    /* газ жмётся сам (W — прыжок) */
    await expect(page.locator('#finish-screen')).toContainText('Призрак обновлён', { timeout: 120_000 });
    await expect(page.locator('#finish-screen')).toContainText('Первый рекорд трассы');
    /* газ жмётся сам (W — прыжок) */
    const saved = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('road_racing_ghost_v1_')).length);
    expect(saved).toBe(1);

    await page.locator('#finish-restart-btn').click();
    await waitRacing(page);
    /* газ жмётся сам (W — прыжок) */
    // призрак стартует вместе с игроком и уезжает вперёд по трассе (z уменьшается)
    const z0 = await page.evaluate(() => window.__raceDebug.ghost.z);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.ghost.z), { timeout: 5_000 }).toBeLessThan(z0 - 3);
    // живое отставание от рекорда считается («👻 РЕКОРД: ±X.X с»), но на плашке заезда скрыто — там только время, сердечки и метры
    await expect(page.locator('#ghostDeltaDisplay')).toContainText(/[−+]\d+\.\d с/, { timeout: 15_000 }); // под нагрузкой полного прогона кадры длиннее
    await expect(page.locator('#ghostDeltaDisplay')).toBeHidden();
    /* газ жмётся сам (W — прыжок) */
    expect(problems).toEqual([]);
});
