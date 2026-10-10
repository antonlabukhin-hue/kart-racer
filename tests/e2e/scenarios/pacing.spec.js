import { test, expect } from '@playwright/test';
import { login, waitRacing, startCampaign } from '../helpers.js';
// Бюджет главы 1 (первые минуты решают всё): трамплин до 20 с, босс до 35 с, финиш до 70 с игрового времени.
// Автопилот держит полосу трамплина и мгновенно роняет босса — замеряется сама трасса, а не игрок.
test('глава 1 укладывается в бюджет: трамплин до 20 с, финиш до 70 с', async ({ page }) => {
    test.skip(!!process.env.CI, 'на медленном CI игровое время растягивается из-за ограничения шага');
    await login(page);
    await startCampaign(page); // «ПОЕХАЛИ» теперь ведёт в бесконечную трассу — глава 1 из кампании
    await waitRacing(page);
    const gaps = await page.evaluate(() => window.__raceDebug.gaps.map(g => ({ z: g.zNear, lane: g.lanes[0] })));
    /* газ жмётся сам (W — прыжок) */
    const r = await page.evaluate((gaps) => new Promise(res => {
        const d = window.__raceDebug, ev = {}; const t0 = performance.now();
        const f = () => {
            (d.animals || []).forEach(a => { a.hit = true; if (a.mesh) a.mesh.visible = false; });
            const g = gaps.find(g => g.z < d.z + 2 && g.z > d.z - 80);
            if (g) d.setX([-2, 0, 2][g.lane]);
            if (d.air && ev.jump == null) ev.jump = d.raceTime;
            if (d.boss && d.boss.mesh && ev.boss == null) ev.boss = d.raceTime;
            if (d.boss && d.boss.active) { d.boss.vulnT = 2; d.boss.x = d.x; d.boss.z = d.z - 0.5; }
            if (d.boss && d.boss.dying && ev.bossDown == null) ev.bossDown = d.raceTime;
            if (d.state !== 'racing' && d.state !== 'countdown') { ev.end = d.raceTime; ev.state = d.state; return res(ev); }
            if (performance.now() - t0 > 170000) return res(ev);
            requestAnimationFrame(f);
        };
        f();
    }), gaps);
    expect(r.state).toBe('win');
    expect(r.jump).toBeLessThan(20);
    expect(r.boss).toBeLessThan(35);
    expect(r.end).toBeLessThan(70);
});
