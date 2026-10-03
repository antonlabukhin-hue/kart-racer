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
    // «До соперника N м»: первая цель — ближайший соперник из таблицы
    await expect(page.locator('#chaseDisplay')).toContainText('🎯 До ');

    // «Е» на трассе: ставим машину на ближайшую — счётчик растёт
    const got = await page.evaluate(async () => {
        const g = window.__raceDebug;
        // цепочка на асфальте (не дуга над разломом): ближайшая впереди
        const c = g.collectibles.filter(c => c.type === 'echip' && c.active && c.baseY === 0.6 && c.z < g.z - 5).sort((a, b) => b.z - a.z)[0];
        g.cars.forEach(car => { car.z = c.z - 300; car.mesh.position.z = car.z; }); // попутки — подальше: проверяем «Е», а не аварию
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
        for (let i = 0; i < 20 && !c; i++) { // кассета — ~раз в 1.7 км: ищем до 10 км вперёд
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
    await expect.poll(() => page.evaluate(() => { const g = window.__raceDebug; return g.obstacles.some(o => o.type === 'spikes' && o.active && o.z < g.z - 3); }), { timeout: 15_000 }).toBe(true); // шипы — впереди машины
    await page.waitForTimeout(1500); // разогнаться
    const hit = await page.evaluate(async () => {
        const g = window.__raceDebug;
        (g.animals || []).forEach(an => { an.hit = true; });
        const o = g.obstacles.filter(o => o.type === 'spikes' && o.active && o.z < g.z - 3).sort((a, b) => b.z - a.z)[0];
        // ставим на шипы, пока не сработают (под нагрузкой кадр может запоздать)
        for (let i = 0; i < 20 && !(g.stats.spikes > 0); i++) {
            g.setStrikes(0); g.setX(o.x); g.setZ(o.z + 0.2);
            await new Promise(r => setTimeout(r, 50));
        }
        // скорость в момент удара запоминает сама игра: машина ехала и потеряла половину
        const ls = g.stats.lastSpike || {};
        return { spikes: g.stats.spikes || 0, strikes: g.strikes, slower: ls.before > 0 && ls.after < ls.before * 0.8 };
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
    await expect(card).toBeVisible({ timeout: 45_000 }); // на медленных кадрах до первого нового на дороге дольше
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

// витрина перед бесконечным заездом: «назад» — в главное меню, а не к старому выбору качества
test('бесконечная трасса: «назад» из витрины машин — в главное меню', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    // событие недели — на карточке режима
    await expect(page.locator('.menu-infinite .mm-note')).toContainText('×2 Е · ');
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await expect(page.locator('#shop-screen')).toBeVisible();
    await page.locator('#shop-close').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    for (const id of ['#difficulty-screen', '#shop-screen']) await expect(page.locator(id)).toBeHidden();
    expect(problems).toEqual([]);
});

// погоня ГАИ: после аварии — «Жигуль» с мигалкой и отсчёт; вторая авария за это время — поймали (дальше «Второй шанс»)
test('погоня ГАИ: вторая авария во время погони — заезд кончается', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('#main-menu-play').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    await page.waitForTimeout(1500);
    // попутка — прямо в машину игрока
    const crash = () => page.evaluate(async () => {
        const g = window.__raceDebug, before = g.strikes;
        for (let i = 0; i < 20 && g.strikes === before && g.state === 'racing'; i++) {
            const c = g.cars[0]; c.hitCooldown = 0; c.x = g.x; c.z = g.z; c.mesh.position.set(c.x, 0, c.z);
            await new Promise(r => setTimeout(r, 50));
        }
        return g.strikes;
    });
    expect(await crash()).toBe(1);
    await expect(page.locator('.police-hud')).toBeVisible();
    await page.evaluate(() => { const c = window.__raceDebug.cars[0]; c.x = 99; c.mesh.position.x = 99; });
    await page.waitForTimeout(600);
    expect(await crash()).toBe(5);
    await expect(page.locator('.police-hud')).toHaveCount(0);
    // ролик поимки (облёт машин с мигалками) и потом — итоги заезда (на «Второй шанс» в тесте нечем платить)
    await expect(page.locator('#finish-screen')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// бусты перед стартом: «Разгон» (600 м на нитро, удары не считаются) и «Запаска» — списываются «Е»
test('бусты: «Разгон» и «Запаска» покупаются в витрине и работают в заезде', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { p.season.chips = 1000; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await expect(page.locator('#shop-boosts')).toBeVisible();
    await page.locator('#shop-boosts .bb-item[data-b="headstart"]').click();
    await page.locator('#shop-boosts .bb-item[data-b="spare"]').click();
    // плашку «Разгон» может сразу сменить другая — запоминаем сам факт появления
    await page.evaluate(() => { window.__sawHead = false; new MutationObserver(() => { const p = document.querySelector('.big-plaque'); if (p && p.textContent.includes('РАЗГОН')) window.__sawHead = true; }).observe(document.body, { childList: true, subtree: true }); });
    await page.locator('#shop-action').click();
    await waitRacing(page);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].season.chips)).toBe(550);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__sawHead), { timeout: 10_000 }).toBe(true);
    // попутка в машину во время «Разгона» — аварии нет
    const strikes = await page.evaluate(async () => {
        const g = window.__raceDebug;
        for (let i = 0; i < 10; i++) { const c = g.cars[0]; c.hitCooldown = 0; c.x = g.x; c.z = g.z; c.mesh.position.set(c.x, 0, c.z); await new Promise(r => setTimeout(r, 50)); }
        return g.strikes;
    });
    expect(strikes).toBe(0);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// коллекция значков 90-х (из ящиков «?») — в «Трофеях»
test('значки 90-х: коллекция видна в «Трофеях»', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { p.badges = { got: { tech: 1, pager: 2 }, done: false }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.mm-tab[data-menu="trophies"]').click();
    await expect(page.locator('#badge-set')).toContainText('Значки 90-х');
    await expect(page.locator('#badge-set')).toContainText('2 / 8');
    await expect(page.locator('#badge-set .got')).toHaveCount(2);
    expect(problems).toEqual([]);
});

// «Горячий старт»: при рекорде 5 км заезд сразу плотный — плашка в начале, попутки уже на старте
test('горячий старт: опытному игроку — плашка и сложность от рекорда', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { p.infinite = { best: 5000, bestScore: 0, runs: 3 }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.evaluate(() => { window.__sawWarm = ''; new MutationObserver(() => { const p = document.querySelector('.big-plaque'); if (p && p.textContent.includes('ГОРЯЧИЙ')) window.__sawWarm = p.textContent; }).observe(document.body, { childList: true, subtree: true }); });
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__sawWarm), { timeout: 15_000 }).toContain('1500 м');
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// «В УДАРЕ»: множитель ×5 — плашка и пламя по краям, попутка в лоб не авария, а «+5 Е»; через 7 с всё гаснет
test('«В ударе»: на ×5 неуязвим, попутки сносятся за «Е», потом гаснет', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    await page.evaluate(() => { const g = window.__raceDebug; for (let i = 0; i < 4; i++) g.riskEvent('nearMiss'); });
    await expect(page.locator('#fever-fx')).toBeVisible();
    await expect(page.locator('.big-plaque')).toContainText('В УДАРЕ');
    // «В ударе» — на нитро: линии скорости по краям (src/juice.js; слой всегда на месте, видно — по прозрачности)
    await expect.poll(() => page.evaluate(() => { const el = document.getElementById('speed-lines'); return el ? +getComputedStyle(el).opacity : 0; })).toBeGreaterThan(0);
    const res = await page.evaluate(async () => {
        const g = window.__raceDebug;
        const e0 = g.stats.eChips || 0;
        const c = g.cars[0]; c.hitCooldown = 0;
        for (let i = 0; i < 6; i++) { c.x = g.x; c.z = g.z; c.mesh.position.set(c.x, 0, c.z); await new Promise(r => setTimeout(r, 50)); if (c.hitCooldown > 0) break; }
        return { strikes: g.strikes, gained: (g.stats.eChips || 0) - e0, fever: g.risk.fever > 0 };
    });
    expect(res.strikes).toBe(0);
    expect(res.gained).toBeGreaterThanOrEqual(5);
    expect(res.fever).toBe(true);
    // на медленных кадрах (CI без видеокарты) игровые 7 с идут дольше — подводим к концу
    await page.evaluate(() => { window.__raceDebug.risk.fever = 0.4; });
    await expect(page.locator('#fever-fx')).toBeHidden({ timeout: 12_000 });
    expect(await page.evaluate(() => window.__raceDebug.risk.mult)).toBeLessThan(5); // сброшен (после — может уже начаться новая цепочка)
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// узор пройден, ничего не задев, — «✔ Чисто!» и множитель риска растёт (путь к «В ударе»)
test('узоры: чистый проход — рисковое действие', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    // узоры отмечены конусами; перескакиваем за первый (ничего не задели)
    const z = await page.evaluate(() => {
        const g = window.__raceDebug;
        const o = g.obstacles.filter(o => o.pat && o.z < g.z - 5).sort((a, b) => b.z - a.z)[0];
        const last = g.obstacles.filter(x => x.pat === o.pat).sort((a, b) => a.z - b.z)[0];
        g.cars.forEach(car => { car.z = last.z - 300; car.mesh.position.z = car.z; }); // попутки — подальше: удар о них не даст «чисто»
        g.setZ(last.z + 2); // перед последним рядом узора — дальше игра едет сама (перескок далеко вперёд «чисто» не даёт)
        const row = g.obstacles.filter(x => x.pat === o.pat && Math.abs(x.z - last.z) < 1); g.setX([-2, 0, 2].find(lx => row.every(x => Math.abs(x.x - lx) > 1.2))); // в свободную полосу последнего ряда
        return last.z;
    });
    await expect.poll(() => page.evaluate(() => window.__raceDebug.stats.patterns || 0), { timeout: 5000 }).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__raceDebug.risk.points)).toBeGreaterThan(0);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// событие пейзажа: посреди «Арсеньева» — свадебный кортеж (4 машины с шариками в одной полосе); проехал без аварии — «Е»
test('событие пейзажа: кортеж — плашка, машины кортежа, награда без аварии', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    await page.evaluate(() => { const g = window.__raceDebug; g.setStrikes(0); g.setZ(g.startZ - 400); });
    await expect(page.locator('.big-plaque')).toContainText('СВАДЕБНЫЙ КОРТЕЖ');
    const convoy = await page.evaluate(() => window.__raceDebug.cars.filter(c => c.convoy).map(c => c.lane));
    expect(convoy.length).toBe(4);
    expect(new Set(convoy).size).toBe(1);
    const e0 = await page.evaluate(() => window.__raceDebug.stats.eChips || 0);
    await page.evaluate(() => { const g = window.__raceDebug; g.setStrikes(0); g.setZ(g.startZ - 640); });
    await expect.poll(() => page.evaluate(() => window.__raceDebug.stats.themeEvents || 0)).toBe(1);
    expect(await page.evaluate(() => window.__raceDebug.stats.eChips || 0)).toBeGreaterThanOrEqual(e0 + 30);
    expect(await page.evaluate(() => window.__raceDebug.cars.filter(c => c.convoy).length)).toBe(0);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// цели на дороге: на дальности рекорда — растяжка «ТВОЙ РЕКОРД», у соперников — щиты; позади — убираются
test('цели на дороге: растяжка рекорда и щиты соперников', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { p.infinite = { best: 900, bestScore: 0, runs: 0 }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.keyboard.down('w');
    await page.evaluate(() => { const g = window.__raceDebug; g.setStrikes(0); g.setZ(g.startZ - 700); });
    // рекорд (900 м) и соперник «Шурик» (800 м) — в пределах видимости
    await expect.poll(() => page.evaluate(() => window.__raceDebug.goals)).toBeGreaterThanOrEqual(2);
    const arch = await page.evaluate(() => window.__raceDebug.scene.children.some(o => o.isGroup && Math.abs(o.position.z - (window.__raceDebug.startZ - 900)) < 0.5));
    expect(arch).toBe(true);
    await page.evaluate(() => { const g = window.__raceDebug; g.setStrikes(0); g.setZ(g.startZ - 960); });
    // позади — убраны (впереди до 960 + 320 м целей нет); на медленных кадрах — с запасом
    await expect.poll(() => page.evaluate(() => window.__raceDebug.goals), { timeout: 15_000 }).toBe(0);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

// «Повторить» в бесконечном заезде — сразу новый заезд на той же машине, без витрины и меню
test('«Повторить» в бесконечном заезде: сразу снова в путь', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    const car0 = await page.evaluate(() => window.__raceDebug.carStats && window.__raceDebug.carStats.name);
    await page.evaluate(() => { window.__raceDebug.setZ(window.__raceDebug.startZ - 120); window.__raceDebug.end('crash'); });
    await expect(page.locator('#finish-restart-btn')).toBeVisible({ timeout: 10_000 });
    await page.locator('#finish-restart-btn').click();
    // новый заезд: снова у старта (короткий отсчёт «1 → GO!» может уже пройти)
    await expect.poll(() => page.evaluate(() => { const g = window.__raceDebug; return !!g && (g.state === 'countdown' || g.state === 'racing') && g.startZ - g.z < 50; }), { timeout: 30_000 }).toBe(true);
    await expect(page.locator('#shop-screen')).toBeHidden();
    await expect(page.locator('#main-menu-screen')).toBeHidden();
    await waitRacing(page);
    expect(await page.evaluate(() => window.__raceDebug.carStats && window.__raceDebug.carStats.name)).toBe(car0);
    expect(problems).toEqual([]);
});

// разлом — не авария с машиной: ГАИ за это не гонится (погоня — только за столкновение с машинами)
test('погоня ГАИ: падение в разлом — без погони', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('#main-menu-play').click();
    await waitRacing(page);
    const res = await page.evaluate(async () => {
        const g = window.__raceDebug;
        let gp = null;
        for (let i = 0; i < 12 && !gp; i++) {
            gp = g.gaps.find(x => !(x.fallT > 0) && x.zFar < g.z - 5);
            if (!gp) { g.setZ(g.z - 400); await new Promise(r => setTimeout(r, 800)); }
        }
        if (!gp) return null;
        const before = g.strikes;
        g.setZ((gp.zNear + gp.zFar) / 2);
        for (let i = 0; i < 40 && g.strikes === before; i++) await new Promise(r => setTimeout(r, 50));
        return g.strikes - before;
    });
    expect(res).toBe(1);
    await page.waitForTimeout(500);
    await expect(page.locator('.police-hud')).toHaveCount(0);
    expect(problems).toEqual([]);
});

// «почти» на итогах: до рекорда не хватило — строка над наградами, тянет нажать «Повторить»
test('итоги бесконечной трассы: «до рекорда не хватило N м»', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { p.infinite = { best: 400, bestScore: 0, runs: 1 }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.evaluate(() => { const g = window.__raceDebug; g.setZ(g.startZ - 300); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen .fin-nearly')).toContainText('До рекорда не хватило', { timeout: 10_000 });
    expect(problems).toEqual([]);
});

// машина дня: в витрине −30% и тест-драйв (раз в день); на итогах — способность и «Купить сегодня»
test('машина дня: тест-драйв и покупка со скидкой на итогах', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1')); l.forEach(p => { p.season.chips = 100000; }); localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l)); });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="infinite"]').click();
    const tile = page.locator('.shop-car-btn', { hasText: '−30%' });
    await expect(tile).toHaveCount(1);
    const carId = await tile.getAttribute('data-car');
    await tile.click();
    await expect(page.locator('#shop-plate')).toContainText('Машина дня');
    await expect(page.locator('#shop-try')).toBeVisible();
    await page.locator('#shop-try').click();
    await waitRacing(page);
    await page.evaluate(() => { const g = window.__raceDebug; g.setZ(g.startZ - 200); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen .fin-testdrive')).toContainText('Тест-драйв', { timeout: 10_000 });
    await page.locator('#finish-buy-car').click();
    await expect(page.locator('#finish-buy-car')).toContainText('твоя');
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0]);
    expect(p.unlockedCars).toContain(carId);
    expect(p.carDay.tried).toBe(true);
    expect(problems).toEqual([]);
});

// «Заезд дня»: в меню карточка с условием дня; одна попытка; на итогах — результат и место; второй раз — «попытка потрачена»
test('заезд дня: одна попытка, результат и место на итогах', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('#mm-daily').click();
    await expect(page.locator('.daily-modal .dl-rule')).toBeVisible();
    await page.locator('.daily-modal .dl-go').click();
    await waitRacing(page);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].daily.started)).toBe(true);
    await page.evaluate(() => { const g = window.__raceDebug; g.setZ(g.startZ - 250); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen .fin-daily')).toContainText('Заезд дня', { timeout: 10_000 });
    await expect(page.locator('#fin-daily-place')).toContainText('место #1');
    await expect(page.locator('#finish-challenge-btn')).toHaveCount(0); // «Заезд дня» — без вызова
    await page.locator('#finish-menu-btn').click();
    await expect(page.locator('#mm-daily-text')).toContainText('✔');
    await page.locator('#mm-daily').click();
    await expect(page.locator('.daily-modal .dl-go')).toHaveCount(0);
    await expect(page.locator('.daily-modal .dl-done')).toContainText('новая завтра');
    expect(problems).toEqual([]);
});

// вызов другу в бесконечной трассе: та же трасса по сиду, друг — цель на дороге, итог вызова
test('вызов другу в бесконечной трассе: ссылка, та же трасса, итог', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    const layout1 = await page.evaluate(() => window.__raceDebug.obstacles.slice(0, 12).map(o => Math.round(o.z) + ':' + o.x).join('|'));
    await page.evaluate(() => { const g = window.__raceDebug; g.setZ(g.startZ - 300); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await page.locator('#finish-challenge-btn').click();
    const url = await page.evaluate(() => window.__lastChallengeUrl);
    expect(url).toContain('m=inf');
    // друг открывает ссылку
    await page.goto(url.replace(/^https?:\/\/[^/]+/, ''));
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await expect(page.locator('#challenge-sub')).toContainText('Бесконечная трасса');
    await page.locator('#challenge-accept').click();
    await waitRacing(page);
    const layout2 = await page.evaluate(() => window.__raceDebug.obstacles.slice(0, 12).map(o => Math.round(o.z) + ':' + o.x).join('|'));
    expect(layout2).toBe(layout1);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen .fin-daily')).toContainText('Вызов от Тестер', { timeout: 10_000 });
    expect(problems).toEqual([]);
});
