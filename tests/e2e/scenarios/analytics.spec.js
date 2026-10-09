import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// Локальная аналитика: старт и финиш заезда попадают в журнал, сводка их видит
test('аналитика: заезд пишется в локальный журнал', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    /* газ жмётся сам (W — прыжок) */
    await expect(page.locator('#finish-screen')).toBeVisible({ timeout: 120_000 });
    /* газ жмётся сам (W — прыжок) */
    const sum = await page.evaluate(() => window.__analytics.summary());
    expect(sum.races).toBe(1);
    expect(sum.finished).toBe(1);
    expect(sum.results.win).toBe(1);
    const end = await page.evaluate(() => window.__analytics.events().find(e => e.e === 'race_end'));
    expect(end).toMatchObject({ state: 'win', map: 'arsenev', diff: 'easy' });
    expect(problems).toEqual([]);
});
