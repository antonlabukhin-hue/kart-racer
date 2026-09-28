import { test, expect } from '@playwright/test';
import { login, startFreeRace, watchProblems, waitRacing } from '../helpers.js';

// Держать босса вплотную к машине несколько кадров — таран. Ставим чуть ПОЗАДИ машины: за кадр он сам
// смещается вперёд и попадает в касание (если поставить впереди, на медленном CI за кадр он успевает отойти)
async function ram(page) {
    return page.evaluate(() => new Promise(res => {
        const d = window.__raceDebug, b = d.boss;
        let n = 0;
        b.invuln = 0;
        const f = () => { b.x = d.x; b.z = d.z + 0.5; if (++n < 20) requestAnimationFrame(f); else res(b.hp); };
        f();
    }));
}

test('босс в броне: таран ранит только после промаха его атаки', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.45');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect.poll(() => page.evaluate(() => !!(window.__raceDebug.boss && window.__raceDebug.boss.mesh)), { timeout: 5000 }).toBe(true);
    const hp0 = await page.evaluate(() => window.__raceDebug.boss.hp);
    expect(await ram(page)).toBe(hp0);            // броня
    await page.evaluate(() => window.__raceDebug.openBoss());
    expect(await ram(page)).toBeLessThan(hp0);    // открыт — удар прошёл (на подобранном нитро — двойной)
    expect(await page.evaluate(() => window.__raceDebug.boss.vulnT)).toBeLessThanOrEqual(0); // окно закрылось
    expect(problems).toEqual([]);
});

test('фазы босса: баррикада в двух полосах; таран навстречу — трамплин и удар сверху ×3', async ({ page }) => {
    // точный тайминг прыжка над бегущим боссом на сервере GitHub (~5 к/с, программная графика) нестабилен;
    // локально (npm run test:e2e:edge) проверяется всегда
    test.skip(!!process.env.CI, 'физика прыжка — только локально');
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.43');
    await startFreeRace(page, 'medium');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect.poll(() => page.evaluate(() => !!(window.__raceDebug.boss && window.__raceDebug.boss.mesh)), { timeout: 5000 }).toBe(true);
    await page.keyboard.down('w');
    await page.evaluate(() => window.__raceDebug.forceBossAttack('barricade'));
    // одним запросом: на медленной машине баррикада успевает уехать за спину между двумя запросами
    await expect.poll(() => page.evaluate(() => { const b = window.__raceDebug.bossBarricades[0]; return b ? b.xs.length : 0; }), { timeout: 15_000 }).toBe(2);

    // таран: держим его полосу — трамплин подбрасывает над боссом; прыжок по времени приблизительный,
    // поэтому до трёх попыток, нужен хотя бы один удар сверху (−3 за раз)
    let stomped = false;
    // без зверей: удар о зверя на подлёте роняет скорость втрое и сбивает прыжок
    await page.evaluate(() => setInterval(() => { (window.__raceDebug.animals || []).forEach(an => { an.hit = true; if (an.mesh) an.mesh.visible = false; }); }, 100));
    // паузы короткие: иначе за три попытки машина доезжает до конца арены и босс сбегает
    for (let attempt = 0; attempt < 3 && !stomped; attempt++) {
        await page.waitForTimeout(600);
        await page.evaluate(() => { const d = window.__raceDebug, b = d.boss; b.hp = 7; b.maxHp = 8; b.z = d.z - 20; b.charging = false; b.returning = false; b.attackState = 'idle'; });
        await page.evaluate(() => window.__raceDebug.forceBossAttack('charge'));
        await expect.poll(() => page.evaluate(() => window.__raceDebug.boss.nextAttack === 'charge' && window.__raceDebug.boss.attackState === 'windup'), { timeout: 15_000 }).toBe(true);
        await page.evaluate(() => { const d = window.__raceDebug; d.setX(d.boss.chargeX); });
        const hp = await page.evaluate(() => new Promise(res => {
            const b = window.__raceDebug.boss; const t0 = performance.now();
            const f = () => { if (b.hp <= 4 || b.returning || performance.now() - t0 > 5000) res(b.hp); else requestAnimationFrame(f); };
            f();
        }));
        stomped = hp <= 4;
    }
    expect(stomped).toBe(true);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

test('отбитый на нитро снаряд ранит босса сквозь броню; кувалда пробивает броню тараном', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.43');
    await startFreeRace(page, 'medium');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect.poll(() => page.evaluate(() => !!(window.__raceDebug.boss && window.__raceDebug.boss.mesh)), { timeout: 5000 }).toBe(true);
    await page.evaluate(() => { const b = window.__raceDebug.boss; b.hp = 7; b.maxHp = 8; });
    // выстрел; держим нитро и стоим на линии огня
    await page.evaluate(() => window.__raceDebug.forceBossAttack('shot'));
    await expect.poll(() => page.evaluate(() => window.__raceDebug.bullets), { timeout: 15_000 }).toBeGreaterThan(0);
    await page.evaluate(() => new Promise(res => {
        const d = window.__raceDebug; let n = 0;
        const f = () => { d.giveNitro(); if (++n < 150 && d.boss.hp >= 7) requestAnimationFrame(f); else res(); };
        f();
    }));
    expect(await page.evaluate(() => window.__raceDebug.boss.hp)).toBe(6);

    // кувалда: подбираем, таран по броне проходит
    await page.evaluate(() => { const d = window.__raceDebug; d.boss._forceAtk = null; d.boss.shotTimer = 99; d.spawnHammer(); const pk = d.bossPickups[0]; d.setX(pk.x); });
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.hammer), { timeout: 8_000 }).toBe(true);
    await page.keyboard.up('w');
    // таран по броне с кувалдой (в залпе могли быть ещё отбитые снаряды — считаем от момента тарана)
    const r = await page.evaluate(() => new Promise(res => {
        const d = window.__raceDebug, b = d.boss; let n = 0; const hp0 = b.hp;
        const f = () => { b.invuln = 0; b.vulnT = 0; b.x = d.x; b.z = d.z + 0.5; if (++n < 40 && b.hp === hp0) requestAnimationFrame(f); else res({ hp0, hp: b.hp, ret: b.returning, ch: b.charging, act: b.active, dy: b.dying, air: d.air, y: d.y, ham: d.hammer, st: d.state }); };
        f();
    }));
    expect(r.hp, JSON.stringify(r)).toBeLessThan(r.hp0);
    expect(await page.evaluate(() => window.__raceDebug.hammer)).toBe(false);
    expect(problems).toEqual([]);
});
