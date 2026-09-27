import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace } from '../helpers.js';

// Поддельный геймпад: window.__fakePad.buttons[i] = true — кнопка нажата
async function fakeGamepad(page) {
    await page.addInitScript(() => {
        window.__fakePad = { buttons: {}, axes: [0, 0] };
        navigator.getGamepads = () => [{
            connected: true,
            axes: window.__fakePad.axes,
            buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!window.__fakePad.buttons[i], value: window.__fakePad.buttons[i] ? 1 : 0 }))
        }];
    });
}

test('геймпад: RT — газ, стик — полоса, Start — пауза', async ({ page }) => {
    const problems = watchProblems(page);
    await fakeGamepad(page);
    await login(page, 'Тестер', './?start=0.3');
    await startFreeRace(page, 'easy');
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state), { timeout: 20_000 }).toBe('racing');
    await page.evaluate(() => { window.__fakePad.buttons[7] = true; window.__fakePad.axes = [0.9, 0]; });
    await expect.poll(() => page.evaluate(() => window.__raceDebug.speed), { timeout: 5_000 }).toBeGreaterThan(0.1);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.x), { timeout: 5_000 }).toBeGreaterThan(0.5);
    await page.evaluate(() => { window.__fakePad.buttons[7] = false; window.__fakePad.axes = [0, 0]; window.__fakePad.buttons[9] = true; });
    await expect(page.locator('#pause-overlay')).toHaveClass(/show/, { timeout: 3_000 });
    await page.evaluate(() => { window.__fakePad.buttons[9] = false; });
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__fakePad.buttons[9] = true; });
    await expect(page.locator('#pause-overlay')).not.toHaveClass(/show/, { timeout: 3_000 });
    expect(problems).toEqual([]);
});

test('геймпад: крестовина водит фокус по меню, A нажимает', async ({ page }) => {
    const problems = watchProblems(page);
    await fakeGamepad(page);
    await login(page);
    const press = async (i) => {
        await page.evaluate(b => { window.__fakePad.buttons[b] = true; }, i);
        await page.waitForTimeout(80);
        await page.evaluate(b => { window.__fakePad.buttons[b] = false; }, i);
        await page.waitForTimeout(80);
    };
    await press(13); // вниз — первая кнопка меню в фокусе
    await expect(page.locator('body')).toHaveClass(/pad-nav/);
    let guard = 0;
    while (guard++ < 20 && !(await page.evaluate(() => document.activeElement && document.activeElement.dataset.menu === 'garage'))) await press(13);
    await press(0); // A — открыть гараж
    await expect(page.locator('#garage-screen')).toBeVisible({ timeout: 5_000 });
    expect(problems).toEqual([]);
});
