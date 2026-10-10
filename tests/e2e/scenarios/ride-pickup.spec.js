import { test, expect } from '@playwright/test';
import { login, waitRacing, watchProblems } from '../helpers.js';

// жетон безумного транспорта шириной ~1.6: задел его краем машины — превращение есть (было: проезжал сквозь край — и ничего)
test('жетон транспорта берётся и краем машины', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    const r = await page.evaluate(async () => {
        const g = window.__raceDebug, wait = ms => new Promise(res => setTimeout(res, ms));
        let c = null;
        for (let k = 0; k < 40 && !c; k++) {
            g.setStrikes(0);
            c = g.collectibles.filter(c => c.type === 'ride' && c.active && c.z < g.z).sort((a, b) => b.z - a.z)[0];
            if (!c) { g.setZ(g.z - 900); await wait(300); }
        }
        if (!c) return { none: true };
        const off = c.x > 0 ? -0.95 : 0.95; // край машины по краю жетона
        g.setZ(c.z + 40); g.setX(c.x + off);
        const t0 = performance.now();
        while (performance.now() - t0 < 8000 && c.active && g.z > c.z - 3) { g.setStrikes(0); if (g.z > c.z + 6) g.setX(c.x + off); await wait(16); }
        return { active: c.active, ride: g.ride };
    });
    expect(r.none).toBeFalsy();
    expect(r.active).toBe(false);
    expect(r.ride).toBeTruthy();
    expect(problems).toEqual([]);
});
