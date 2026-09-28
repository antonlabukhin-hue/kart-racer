import { test, expect } from '@playwright/test';
import { login, startFreeRace, watchProblems, waitRacing } from '../helpers.js';

const noAnimals = (page) => page.evaluate(() => setInterval(() => {
    const d = window.__raceDebug;
    (d.animals || []).forEach(an => { an.hit = true; if (an.mesh) an.mesh.visible = false; });
    (d.cars || []).forEach(c => { if (c.mesh) { c.x = 99; c.mesh.position.x = 99; } });
}, 50));

test('погоня стаи: на финальном отрезке стая бежит следом; сбросил газ — догнала и укусила (+время, не авария)', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.8');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await noAnimals(page);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.pack && window.__raceDebug.pack.active), { timeout: 20_000 }).toBe(true);
    await expect(page.locator('#pack-meter')).toBeVisible();
    expect(await page.evaluate(() => window.__raceDebug.pack.meshes)).toBe(4);
    await page.keyboard.up('w');
    const strikes0 = await page.evaluate(() => window.__raceDebug.strikes);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.pack.bites), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(() => window.__raceDebug.strikes)).toBe(strikes0);
    expect(problems).toEqual([]);
});
