import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// Победа сохраняет призрака; на «Заново» он едет по трассе рядом с игроком
test('призрак: после победы на следующем заезде едет запись лучшего', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.ghost), { timeout: 10_000 }).toBeNull();
    await page.keyboard.down('w');
    await expect(page.locator('#finish-screen')).toContainText('Призрак обновлён', { timeout: 120_000 });
    await page.keyboard.up('w');
    const saved = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('road_racing_ghost_v1_')).length);
    expect(saved).toBe(1);

    await page.locator('#finish-restart-btn').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    // призрак стартует вместе с игроком и уезжает вперёд по трассе (z уменьшается)
    const z0 = await page.evaluate(() => window.__raceDebug.ghost.z);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.ghost.z), { timeout: 5_000 }).toBeLessThan(z0 - 3);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});
