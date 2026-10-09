import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// Физика прыжка (src/race-physics.js) в живом заезде: по полосе трамплина — взлёт и перелёт разлома без аварии
test('разлом: по полосе трамплина машина взлетает и перелетает без аварии', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.22');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    const gap = await page.evaluate(() => { const g = window.__raceDebug.gaps[0]; return { zNear: g.zNear, zFar: g.zFar, lane: g.lanes[0] }; });
    const laneX = [-1.5, 0, 1.5][gap.lane];
    /* газ жмётся сам (W — прыжок) */
    const r = await page.evaluate(({ laneX, zFar }) => new Promise(res => {
        // удары за перелёт — по журналу ударов: жвачка над разломом лечит, и разница аварий бывала −1
        const d = window.__raceDebug; const h0 = d.hitLog.length; let flew = false, maxY = 0; const t0 = performance.now();
        // звери не мешают замеру
        const f = () => {
            (d.animals || []).forEach(a => { a.hit = true; if (a.mesh) a.mesh.visible = false; });
            (d.cars || []).forEach(c => { if (Math.abs(c.z - d.z) < 60) { c.z = d.z - 400; if (c.mesh) c.mesh.position.z = c.z; } }); // и попутки
            d.setX(laneX);
            if (d.air) { flew = true; maxY = Math.max(maxY, d.y); }
            if (d.z < zFar - 6 || performance.now() - t0 > 30000) res({ flew, maxY, strikes: d.hitLog.length - h0 }); else requestAnimationFrame(f);
        };
        f();
    }), { laneX, zFar: gap.zFar });
    /* газ жмётся сам (W — прыжок) */
    expect(r.flew).toBe(true);
    expect(r.maxY).toBeGreaterThan(0.85);
    expect(r.strikes).toBe(0);
    // перелёт разлома без удара — «чистая посадка» с плашкой и рывком нитро
    await expect.poll(() => page.evaluate(() => window.__raceDebug.stats.cleanLandings || 0), { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
    expect(problems).toEqual([]);
});
