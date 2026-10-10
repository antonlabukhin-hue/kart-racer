import { test, expect } from '@playwright/test';
import { login, waitRacing } from '../helpers.js';
// отпустил руль между полосами — машина встаёт в центр; ехал на попутку и ушёл в соседнюю полосу в последний момент — «на волоске»
test('центр полосы и «на волоске» при увороте', async ({ page }) => {
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async () => {
        const g = window.__raceDebug, wait = ms => new Promise(res => setTimeout(res, ms));
        g.setStrikes(0); g.setX(1.3); { const t0 = performance.now(); while (Math.abs(g.x - 2) > 0.08 && performance.now() - t0 < 15000) await wait(100); } /* по игровому состоянию: на медленной машине (CI) игра идёт медленнее */
        const x1 = g.x;
        const res = [];
        for (let i = 0; i < 2; i++) {
            const cs = g.cars.filter(c => c.active !== false); cs.forEach(c => { c.z = g.z - 500 - Math.random() * 100; c.mesh.position.z = c.z; });
            g.setX(0); const c = cs[0]; c.x = 0; c.lane = 1; c.targetLane = 1; c.isChangingLane = false; c.laneChangeTimer = 99; c.z = g.z - 30; c.mesh.position.set(0, c.mesh.position.y, c.z);
            const n0 = g.nearMiss;
            await new Promise(r2 => { const f = () => { if (g.z - c.z < 3) r2(); else requestAnimationFrame(f); }; f(); });
            g.setX(2); // увернулся в последний момент
            await new Promise(r2 => { const f = () => { if (g.z - c.z < -3.5) r2(); else requestAnimationFrame(f); }; f(); });
            res.push({ nm: g.nearMiss - n0, strikes: g.strikes });
            await wait(1400);
        }
        return { x1, res };
    });
    expect(r.x1).toBeGreaterThan(1.9);
    expect(r.res.some(q => q.nm > 0), JSON.stringify(r)).toBe(true); // хотя бы один из двух (попутку мог задеть зверь)
});
