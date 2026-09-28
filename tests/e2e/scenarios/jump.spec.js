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
    await page.keyboard.down('w');
    const r = await page.evaluate(({ laneX, zFar }) => new Promise(res => {
        const d = window.__raceDebug; const s0 = d.strikes; let flew = false, maxY = 0; const t0 = performance.now();
        // звери не мешают замеру
        const f = () => {
            (d.animals || []).forEach(a => { a.hit = true; if (a.mesh) a.mesh.visible = false; });
            d.setX(laneX);
            if (d.air) { flew = true; maxY = Math.max(maxY, d.y); }
            if (d.z < zFar - 6 || performance.now() - t0 > 30000) res({ flew, maxY, strikes: d.strikes - s0 }); else requestAnimationFrame(f);
        };
        f();
    }), { laneX, zFar: gap.zFar });
    await page.keyboard.up('w');
    expect(r.flew).toBe(true);
    expect(r.maxY).toBeGreaterThan(0.85);
    expect(r.strikes).toBe(0);
    expect(problems).toEqual([]);
});
