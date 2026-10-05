import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// самый первый заезд новичка — постановочный (src/first-run.js): трамплин, щит, нитро в средней полосе, 30 с без аварий
test('первый заезд: трамплин, щит и нитро в средней полосе; в начале удары не считаются', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Новичок', './', { fresh: true });
    await page.locator('#main-menu-play').click();
    await waitRacing(page);
    const lay = await page.evaluate(() => {
        const g = window.__raceDebug, S = g.startZ;
        const near = (list, d, tol) => list.some(o => Math.abs((S - o.z) - d) < (tol || 3) && Math.abs(o.x) < 0.3);
        return { ramp: near(g.ramps.filter(r => !r.gapRamp), 95), board: near(g.smashBoards, 190), nitro: near(g.collectibles.filter(c => c.type === 'nitro'), 285, 25) }; // нитро двигают от арок с грузом — до ~1 с позже
    });
    expect(lay).toEqual({ ramp: true, board: true, nitro: true });
    // попутка прямо в машину — аварии нет (первые 30 с)
    await page.evaluate(() => { const g = window.__raceDebug, c = g.cars.find(c => c.active); c.z = g.z - 0.4; c.x = g.x; c.mesh.position.set(g.x, c.mesh.position.y, c.z); });
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__raceDebug.strikes)).toBe(0);
    expect(problems).toEqual([]);
});
