import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// «Ещё раз» за секунду: на поражении R (или «Повторить») — и через ~1 с снова едешь; «почти доехал» — на экране
test('«Повторить»: короткий отсчёт, R на финише, «до финиша оставалось»', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.9');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('до финиша оставалось', { ignoreCase: true });
    await expect(page.locator('#finish-screen')).toContainText('почти доехал');
    const t0 = Date.now();
    await page.keyboard.press('r');
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state), { timeout: 10_000, intervals: [100] }).toBe('racing');
    const took = (Date.now() - t0) / 1000;
    console.log('RETRY', took.toFixed(2));
    expect(took).toBeLessThan(2.5);
    expect(problems).toEqual([]);
});
