import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// Единый выход из заезда: после «Меню» из паузы от гонки ничего не остаётся, новый заезд стартует чисто
test('выход в меню посреди боя: интерфейс гонки убран, следующий заезд стартует', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.43');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect(page.locator('#boss-intro')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.locator('#pause-menu').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    for (const sel of ['#game-hud', '#boss-intro', '#boss-hud', '#boss-cue', '#pack-meter', '#hud-speedo', '#coach-tip', '#finish-screen', '#endless-wave-card', '.boss-shout']) {
        await expect(page.locator(sel), sel).toHaveCount(0);
    }
    expect(await page.evaluate(() => [window.__inRace, document.body.classList.contains('race-mode'), !!window.__gameRenderer])).toEqual([false, false, false]);
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    expect(problems).toEqual([]);
});
