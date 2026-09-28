import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// Арсеньев: ремонт (одна полоса закрыта) на 44%, тоннель на 52%
test('участки трассы: в закрытую полосу ремонта — авария; в тоннеле темнеет и горят фары', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.415');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    const segs = await page.evaluate(() => window.__raceDebug.roadSegments.map(s => ({ t: s.type, x: s.x })));
    expect(segs.map(s => s.t)).toEqual(['roadworks', 'tunnel']);
    const s0 = await page.evaluate(() => window.__raceDebug.strikes);
    // держим машину в закрытой полосе до удара
    await page.keyboard.down('w');
    await page.evaluate(x => new Promise(res => {
        const d = window.__raceDebug; const st = d.strikes; const t0 = performance.now();
        const f = () => { if (d.strikes > st || performance.now() - t0 > 15000) res(); else { d.setX(x); requestAnimationFrame(f); } };
        f();
    }), segs[0].x);
    expect(await page.evaluate(() => window.__raceDebug.strikes)).toBeGreaterThan(s0);
    // тоннель: темнота нарастает
    await expect.poll(() => page.evaluate(() => window.__raceDebug.tunnel), { timeout: 30_000 }).toBeGreaterThan(0.5);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

test('бонусы с риском: жвачка под каждой аркой и в тёмном тоннеле — подбирается', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.5');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    const risk = await page.evaluate(() => window.__raceDebug.riskBonuses);
    expect(risk.filter(r => r.risk === 'arch')).toHaveLength(3);
    const dark = risk.find(r => r.risk === 'tunnel');
    expect(dark).toBeTruthy();
    await page.keyboard.down('w');
    const got = await page.evaluate(({ x, z }) => new Promise(res => {
        const d = window.__raceDebug; const g0 = d.stats.gumPicked || 0; const t0 = performance.now();
        const f = () => {
            (d.animals || []).forEach(a => { a.hit = true; if (a.mesh) a.mesh.visible = false; });
            d.setX(x);
            if (d.z < z - 5 || performance.now() - t0 > 20000) res((d.stats.gumPicked || 0) - g0); else requestAnimationFrame(f);
        };
        f();
    }), { x: dark.x, z: dark.z });
    await page.keyboard.up('w');
    expect(got).toBeGreaterThanOrEqual(1);
    expect(problems).toEqual([]);
});
