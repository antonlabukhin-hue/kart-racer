import { test, expect } from '@playwright/test';
import { openFreeRace, login, startFreeRace, watchProblems, waitRacing, skipLoreIfShown } from '../helpers.js';

const noAnimals = (page) => page.evaluate(() => setInterval(() => {
    const d = window.__raceDebug;
    (d.animals || []).forEach(an => { an.hit = true; if (an.mesh) an.mesh.visible = false; });
    (d.cars || []).forEach(c => { if (c.mesh) { c.x = 99; c.mesh.position.x = 99; } });
}, 50));

test('рекламный щит в полосе: снёс — не авария, +щит в статистике', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.02');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await noAnimals(page);
    const boards = await page.evaluate(() => window.__raceDebug.smashBoards.map(b => ({ x: b.x, z: b.z })));
    expect(boards.length).toBeGreaterThanOrEqual(1); // часть мест теперь занимают события (трактор, кран…)
    // держим полосу ближайшего щита впереди
    await page.evaluate(() => setInterval(() => {
        const d = window.__raceDebug;
        const b = d.smashBoards.filter(x => !x.smashed && x.z < d.z).sort((a, c) => c.z - a.z)[0];
        if (b) d.setX(b.x);
        // проверяем только щит: попутки, ямы и падающий груз с пути убраны (тест изредка падал от случайной ямы/грузовика)
        (d.cars || []).forEach(c => { if (c.mesh) { c.x = 99; c.mesh.position.x = 99; } });
        (d.obstacles || []).forEach(o => { o.active = false; });
        if (window.__fallingDebris) window.__fallingDebris.length = 0;
    }, 30));
    // плашка «Реклама снесена!» живёт ~2 с — запоминаем сам факт появления (на медленной машине проверка могла опоздать)
    await page.evaluate(() => { window.__sawSmash = false; new MutationObserver(() => { if (document.querySelector('.big-plaque.smash')) window.__sawSmash = true; }).observe(document.body, { childList: true }); });
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.stats.billboards || 0), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
    // подсказка «рекламу можно сносить» — часть обучения, по умолчанию его нет; после удара — плашка с бонусом
    expect(await page.evaluate(() => Number(localStorage.getItem('road_racing_hint_board') || 0))).toBe(0);
    await expect.poll(() => page.evaluate(() => window.__sawSmash), { timeout: 5_000 }).toBe(true);
    await page.keyboard.up('w');
    expect(await page.evaluate(() => window.__raceDebug.strikes)).toBe(0);
    expect(problems).toEqual([]);
});

test('промзона: труба рушится с эстакады поперёк двух полос — по свободной полосе проезд без аварии', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.1');
    await page.evaluate(() => {
        const list = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
        list.forEach(p => { p.unlockedMaps = ['arsenev', 'promzona', 'svalka']; p.hasSeenShop = true; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(list));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await openFreeRace(page);
    await page.locator('.difficulty-btn[data-diff="easy"]').click();
    await skipLoreIfShown(page);
    await page.locator('.map-card[data-map="promzona"]').click();
    await page.locator('#map-select-go').click();
    await waitRacing(page);
    await noAnimals(page);
    const pipe = await page.evaluate(() => { const p = window.__raceDebug.pipeDrop; return p && { z: p.z, free: p.freeLane }; });
    expect(pipe).toBeTruthy();
    // по свободной полосе
    await page.evaluate((free) => setInterval(() => window.__raceDebug.setX([-2, 0, 2][free] * window.__raceDebug.trackWidth / 8), 30), pipe.free);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.pipeDrop.debug.state), { timeout: 40_000 }).toBe('down');
    await expect.poll(() => page.evaluate((z) => window.__raceDebug.z < z - 5, pipe.z), { timeout: 20_000 }).toBe(true);
    await page.keyboard.up('w');
    expect(await page.evaluate(() => window.__raceDebug.hitLog.filter(h => h.cause === 'pipe').length)).toBe(0);
    expect(problems).toEqual([]);
});

for (const map of ['arsenev', 'promzona', 'svalka']) {
    test('узнаваемые детали: ' + map + ' — события в полосах и приметы у обочины, проезд без ошибок', async ({ page }) => {
        const problems = watchProblems(page);
        await login(page, 'Тестер', './?start=0.05');
        await page.evaluate(() => {
            const list = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
            list.forEach(p => { p.unlockedMaps = ['arsenev', 'promzona', 'svalka']; p.hasSeenShop = true; });
            localStorage.setItem('road_racing_profiles_v1', JSON.stringify(list));
        });
        await page.reload();
        await page.locator('#splash-screen').click();
        await page.locator('#profile-list').getByText('Тестер').click();
        await openFreeRace(page);
        await page.locator('.difficulty-btn[data-diff="easy"]').click();
        await skipLoreIfShown(page);
        await page.locator('.map-card[data-map="' + map + '"]').click();
        await page.locator('#map-select-go').click();
        await waitRacing(page);
        const evs = await page.evaluate(() => window.__raceDebug.setEvents.map(e => ({ kind: e.kind, z: e.z })));
        expect(evs.length).toBeGreaterThanOrEqual(1);
        // проехать сквозь первое событие: оно срабатывает (двигается/падает) и не ломает заезд
        await noAnimals(page);
        await page.evaluate((z) => window.__raceDebug.setZ(z + 70), evs[0].z);
        await page.keyboard.down('w');
        await expect.poll(() => page.evaluate((z) => window.__raceDebug.z < z - 5, evs[0].z), { timeout: 60_000 }).toBe(true);
        await page.keyboard.up('w');
        expect(await page.evaluate(() => { const s = window.__raceDebug.setEvents[0].debug; return s.state || 'swing'; })).not.toBe('wait');
        expect(problems).toEqual([]);
    });
}
