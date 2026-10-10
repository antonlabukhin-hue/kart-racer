import { test, expect } from '@playwright/test';
import { openFreeRace, login, startFreeRace, watchProblems, waitRacing, skipLoreIfShown } from '../helpers.js';

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

test('босс: увороты копят шкалу тарана, полная — таран сам; случайное касание не ранит', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.45');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect.poll(() => page.evaluate(() => !!(window.__raceDebug.boss && window.__raceDebug.boss.mesh)), { timeout: 5000 }).toBe(true);
    const hp0 = await page.evaluate(() => window.__raceDebug.boss.hp);
    // полоска в HUD: имя, фаза, столько сегментов, сколько HP, и шкала тарана
    await expect(page.locator('#boss-hud')).toHaveClass(/on/);
    await expect(page.locator('#boss-hud .bh-phase')).toContainText('Фаза 1');
    await expect(page.locator('#boss-hud .bh-hp i.on')).toHaveCount(hp0);
    await expect(page.locator('#boss-hud .bh-charge')).toBeVisible();
    expect(await ram(page)).toBe(hp0);            // шкала пустая — касание только отбрасывает
    // залп мимо: уводим машину в полосу подальше от ближайшего снаряда, пока он не пролетит
    await page.evaluate(() => { const d = window.__raceDebug; d.boss.invuln = 30; d.forceBossAttack('shot'); });
    await expect.poll(() => page.evaluate(() => window.__raceDebug.bullets), { timeout: 15_000 }).toBeGreaterThan(0);
    const got = await page.evaluate(() => new Promise(res => {
        const d = window.__raceDebug, b = d.boss; const t0 = performance.now();
        const f = () => {
            let near = null; d.bossBullets.forEach(bu => { if (!near || Math.abs(bu.z - d.z) < Math.abs(near.z - d.z)) near = bu; });
            if (near) { const lanes = [-2, 0, 2]; d.setX(lanes.reduce((a, x) => Math.abs(x - near.x) > Math.abs(a - near.x) ? x : a, 0)); }
            b._forceAtk = null; b.shotTimer = 99;
            if ((b.charge || 0) > 0 || b.vulnT > 0 || performance.now() - t0 > 12000) res({ charge: b.charge, v: b.vulnT, bullets: d.bullets }); else requestAnimationFrame(f);
        };
        f();
    }));
    expect(got.charge > 0 || got.v > 0, JSON.stringify(got)).toBe(true);
    await expect.poll(() => page.evaluate(() => { const w = document.querySelector('#boss-hud .bh-charge b'); return w ? parseFloat(w.style.width) : 0; })).toBeGreaterThan(0);
    // дозаряжаем до полной: «ТАРАН!» по центру, босса тянет под машину — HP падает без всякого тарана
    await page.evaluate(() => { const d = window.__raceDebug; d.boss.invuln = 0; d.chargeBoss(100); });
    await expect(page.locator('#boss-cue')).toHaveText('ТАРАН!');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.boss.hp), { timeout: 10_000 }).toBeLessThan(hp0);
    const hp1 = await page.evaluate(() => window.__raceDebug.boss.hp);
    await expect(page.locator('#boss-hud .bh-hp i.on')).toHaveCount(hp1);
    expect(await page.evaluate(() => window.__raceDebug.boss.charge)).toBeLessThan(50); // шкала с нуля (обгон попутки впритирку успевает дать +10)
    await expect.poll(() => page.evaluate(() => { const c = document.getElementById('boss-cue'); return !!c && c.classList.contains('on') && c.textContent.trim() === 'ТАРАН!'; })).toBe(false);
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
    /* газ жмётся сам (W — прыжок) */
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
    /* газ жмётся сам (W — прыжок) */
    expect(problems).toEqual([]);
});

test('отбитый на нитро снаряд ранит босса', async ({ page }) => {
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
        const f = () => { d.giveNitro(); const bu = d.bossBullets.filter(b => !b.reflected)[0]; if (bu) d.setX(bu.x); /* босс в ~20 м: встаём на линию снаряда */ if (++n < 150 && d.boss.hp >= 7) requestAnimationFrame(f); else res(); };
        f();
    }));
    expect(await page.evaluate(() => window.__raceDebug.boss.hp)).toBeLessThan(7); // газ жмётся сам — машина может пройти сквозь залп и отбить больше одного

    expect(problems).toEqual([]);
});

test('снежная трасса: босс стреляет льдом — попадание делает руль скользким', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.43');
    await openFreeRace(page);
    const shop = page.locator('#shop-action');
    if (await shop.isVisible()) await shop.click();
    await page.locator('.difficulty-btn[data-diff="easy"]').click();
    await skipLoreIfShown(page);
    await page.evaluate(() => { window.__trackTheme = 'snow'; });
    await page.locator('#map-select-go').click();
    await waitRacing(page);
    expect(await page.evaluate(() => window.__trackThemeActive)).toBe('snow');
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect.poll(() => page.evaluate(() => !!(window.__raceDebug.boss && window.__raceDebug.boss.mesh)), { timeout: 5000 }).toBe(true);
    await page.evaluate(() => window.__raceDebug.forceBossAttack('shot'));
    // стоим на линии огня: держим машину под боссом, пока не попадёт
    const slid = await page.evaluate(() => new Promise(res => {
        const d = window.__raceDebug; const t0 = performance.now();
        const f = () => { if (d.boss) d.setX(d.boss.x); if (d.slide > 1 || performance.now() - t0 > 15000) res(d.slide); else requestAnimationFrame(f); };
        f();
    }));
    expect(slid).toBeGreaterThan(1);
    expect(problems).toEqual([]);
});

test('босс не добит до конца арены — сбегает с обещанием реванша', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.78');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await page.evaluate(() => setInterval(() => { (window.__raceDebug.animals || []).forEach(an => { an.hit = true; if (an.mesh) an.mesh.visible = false; }); }, 100));
    /* газ жмётся сам (W — прыжок) */
    await expect(page.locator('#boss-intro.escape')).toContainText('Догоним в следующем заезде', { timeout: 30_000 });
    /* газ жмётся сам (W — прыжок) */
    await expect(page.locator('#boss-hud')).not.toHaveClass(/on/);
    expect(problems).toEqual([]);
});
