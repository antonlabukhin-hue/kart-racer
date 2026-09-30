import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// «Бесконечная трасса» вместо свободного заезда: нет финиша, босса и лимита времени; пейзажи сменяются,
// «Е» собираются, позади всё убирается; конец — только по авариям, с рекордом дальности
test('бесконечная трасса: пейзажи, «Е», уборка позади и итог с рекордом', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('.menu-card[data-menu="race"]')).toBeHidden();
    await page.locator('.menu-card[data-menu="infinite"]').click();
    // первый раз — витрина машин (как выбор персонажа в Subway Surfers): «Ушастик» бесплатный — поехали на нём
    await expect(page.locator('#shop-action')).toContainText('ПОЕХАЛИ');
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await expect(page.locator('#infDisplay')).toContainText('м · Е');
    await expect(page.locator('#weatherDisplay')).toContainText('Арсеньев, день');

    // «Е» на трассе: ставим машину на ближайшую — счётчик растёт
    const got = await page.evaluate(async () => {
        const g = window.__raceDebug;
        // цепочка на асфальте (не дуга над разломом): ближайшая впереди
        const c = g.collectibles.filter(c => c.type === 'echip' && c.active && c.baseY === 0.6 && c.z < g.z - 5).sort((a, b) => b.z - a.z)[0];
        g.setX(c.x); g.setZ(c.z + 0.2);
        await new Promise(r => setTimeout(r, 400));
        return g.stats.eChips || 0;
    });
    expect(got).toBeGreaterThan(0);

    // вперёд по пейзажам: промзона → снег → ночь; время идёт вверх, босса и финиша нет
    for (const [k, name] of [[1, 'Промзона'], [2, 'Снежная тайга'], [3, 'Ночная трасса']]) {
        await page.evaluate(k => { const g = window.__raceDebug; g.setStrikes(0); g.setZ(g.startZ - (k * 900 + 300)); }, k);
        await expect(page.locator('#weatherDisplay')).toContainText(name, { timeout: 15_000 });
    }
    const s = await page.evaluate(() => {
        const g = window.__raceDebug;
        return { state: g.state, boss: !!g.boss, dist: g.inf.dist, night: window.weatherMode };
    });
    expect(s.state).toBe('racing');
    expect(s.boss).toBe(false);
    expect(s.dist).toBeGreaterThan(2900);
    // пройденное убирается (раз в ~60 кадров): позади ни бонусов, ни препятствий, ни кругов расстановки
    await expect.poll(() => page.evaluate(() => { const g = window.__raceDebug; return g.collectibles.concat(g.obstacles).filter(c => c.z > g.z + 200).length; }), { timeout: 10_000 }).toBe(0);
    expect(s.night).toBe('night');
    const t = await page.evaluate(() => window.__raceDebug.raceTime);
    expect(t).toBeGreaterThan(1);

    // видеокассета — редкая валюта: ищем впереди, подбираем
    const vhs = await page.evaluate(async () => {
        const g = window.__raceDebug;
        let c = null;
        for (let i = 0; i < 10 && !c; i++) {
            c = g.collectibles.find(o => o.type === 'vhs' && o.active);
            if (!c) { g.setStrikes(0); g.setZ(g.z - 500); await new Promise(r => setTimeout(r, 1500)); }
        }
        g.setStrikes(0); g.setX(c.x); g.setZ(c.z + 0.2);
        await new Promise(r => setTimeout(r, 400));
        return g.stats.vhs || 0;
    });
    expect(vhs).toBe(1);

    // конец — по авариям: итог с дальностью и рекордом, в меню — рекорд на карточке
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('ЗАЕЗД ОКОНЧЕН', { timeout: 10_000 });
    await expect(page.locator('#finish-screen')).toContainText('НОВЫЙ РЕКОРД ДАЛЬНОСТИ');
    await expect(page.locator('#finish-screen .fin-chip[title="видеокассеты"]')).toContainText('1');
    await page.locator('#finish-menu-btn').click();
    await expect(page.locator('#menu-inf-best')).toContainText(/🏆 \d+ м/);
    await expect(page.locator('#mm-vhs')).toHaveText('1');
    expect(problems).toEqual([]);
});

// Усиления (магнит, ×2, броня) и «Второй шанс»: после пятой аварии — продолжить за «Е» (100, потом 200) или кассету
test('бесконечная трасса: усиление подбирается; «Второй шанс» продолжает заезд за «Е»', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const list = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
        list.forEach(p => { p.season = Object.assign({}, p.season, { chips: 500 }); });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(list));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="infinite"]').click();
    // первый раз — витрина машин (как выбор персонажа в Subway Surfers): «Ушастик» бесплатный — поехали на нём
    await expect(page.locator('#shop-action')).toContainText('ПОЕХАЛИ');
    await page.locator('#shop-action').click();
    await waitRacing(page);

    const picked = await page.evaluate(async () => {
        const g = window.__raceDebug;
        let c = null;
        for (let i = 0; i < 6 && !c; i++) {
            c = g.collectibles.find(o => o.type === 'power' && o.active);
            if (!c) { g.setZ(g.z - 400); await new Promise(r => setTimeout(r, 1500)); }
        }
        g.setStrikes(0); g.setX(c.x); g.setZ(c.z + 0.2);
        await new Promise(r => setTimeout(r, 400));
        return g.powers.picked;
    });
    expect(picked).toBe(1);

    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('.chance-modal')).toContainText('100 Е');
    await page.locator('.chance-modal .cc-pay-e').click();
    await expect(page.locator('.chance-modal')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => [window.__raceDebug.state, window.__raceDebug.strikes].join())).toBe('racing,3');
    // после оплаты машина едет дальше (раньше игровой цикл вставал)
    const z0 = await page.evaluate(() => window.__raceDebug.z);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(z0 => z0 - window.__raceDebug.z, z0), { timeout: 8_000 }).toBeGreaterThan(5);
    await page.keyboard.up('w');
    // второй раз дороже; отказ — итоги
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('.chance-modal')).toContainText('200 Е');
    await page.locator('.chance-modal .cc-no').click();
    await expect(page.locator('#finish-screen')).toContainText('ЗАЕЗД ОКОНЧЕН', { timeout: 10_000 });
    expect(problems).toEqual([]);
});

// «Вкус победы»: новый рекорд — салют и плашка, потом крутится золотая «Е» с набегающим числом, потом итоги
test('бесконечная трасса: рекорд — салют, потом золотая «Е», потом итоги', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => { sessionStorage.setItem('keep_reveal', '1'); localStorage.removeItem('road_racing_skip_reveal'); });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.evaluate(() => { const g = window.__raceDebug; g.setZ(g.z - 300); });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('.reward-reveal .rr-record-plaque')).toContainText('НОВЫЙ РЕКОРД', { timeout: 10_000 });
    await page.locator('.reward-reveal .rr-next').click();
    await expect(page.locator('.reward-reveal .rr-gold')).toBeVisible();
    await expect(page.locator('.reward-reveal .rr-spin')).toBeVisible();
    await expect.poll(() => page.evaluate(() => parseInt(document.querySelector('.rr-gold b').textContent.replace('+', ''), 10))).toBeGreaterThan(0);
    await page.locator('.reward-reveal .rr-next').click();
    await expect(page.locator('#finish-screen')).toContainText('ЗАЕЗД ОКОНЧЕН');
    expect(problems).toEqual([]);
});

// ящик «?» — случайный исход, не авария; шипы (после 600 м) — не авария, но скорость падает
test('бесконечная трасса: ящик «?» разбивается с исходом, шипы тормозят без аварии', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    const crate = await page.evaluate(async () => {
        const g = window.__raceDebug;
        const c = g.collectibles.filter(c => c.type === 'crate' && c.active && c.z < g.z - 5).sort((a, b) => b.z - a.z)[0];
        if (!c) return null;
        g.setX(c.x); g.setZ(c.z + 0.3);
        await new Promise(r => setTimeout(r, 300));
        return { crates: g.stats.crates || 0, strikes: g.strikes };
    });
    expect(crate).toEqual({ crates: 1, strikes: 0 });
    await expect(page.locator('.big-plaque')).toBeVisible();
    // вперёд за 600 м — там уже шипы
    await page.evaluate(() => { const g = window.__raceDebug; g.setZ(g.startZ - 700); });
    await expect.poll(() => page.evaluate(() => window.__raceDebug.obstacles.some(o => o.type === 'spikes' && o.active)), { timeout: 15_000 }).toBe(true);
    await page.waitForTimeout(1500); // разогнаться
    const hit = await page.evaluate(async () => {
        const g = window.__raceDebug;
        (g.animals || []).forEach(an => { an.hit = true; });
        const o = g.obstacles.filter(o => o.type === 'spikes' && o.active && o.z < g.z - 3).sort((a, b) => b.z - a.z)[0];
        // ставим на шипы, пока не сработают (под нагрузкой кадр может запоздать)
        let before = 0;
        for (let i = 0; i < 20 && !(g.stats.spikes > 0); i++) {
            g.setStrikes(0); before = g.speed; g.setX(o.x); g.setZ(o.z + 0.2);
            await new Promise(r => setTimeout(r, 50));
        }
        return { spikes: g.stats.spikes || 0, strikes: g.strikes, slower: g.speed < before * 0.8 };
    });
    expect(hit).toEqual({ spikes: 1, strikes: 0, slower: true });
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// первый заезд: перед новым на дороге — пауза и плашка «что это», «Продолжить» — едем дальше; второй раз то же не показывается
test('первое знакомство: пауза с плашкой перед новым, «Продолжить» — дальше', async ({ page }) => {
    const problems = watchProblems(page);
    await page.addInitScript(() => sessionStorage.setItem('keep_meet', '1'));
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    const card = page.locator('.meet-overlay .meet-card');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.locator('.meet-go')).toContainText('Продолжить');
    const title = await card.locator('.meet-title').textContent();
    // пока плашка открыта — заезд стоит
    const z1 = await page.evaluate(() => window.__raceDebug.z);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.__raceDebug.z)).toBe(z1);
    await card.locator('.meet-go').click();
    await expect(page.locator('.meet-overlay')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.z), { timeout: 5_000 }).toBeLessThan(z1);
    // знакомое запомнено
    const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_met_v1') || '[]'));
    expect(seen.length).toBeGreaterThanOrEqual(1);
    // «Больше не подсказывать» — все знакомства отмечены
    await expect(card).toBeVisible({ timeout: 20_000 });
    expect(await card.locator('.meet-title').textContent()).not.toBe(title);
    await card.locator('.meet-off').click();
    await expect(page.locator('.meet-overlay')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_met_v1')).length)).toBe(15);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});
