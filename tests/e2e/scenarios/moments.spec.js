import { test, expect } from '@playwright/test';
import { login, startFreeRace, watchProblems, waitRacing, skipLoreIfShown } from '../helpers.js';

const noAnimals = (page) => page.evaluate(() => setInterval(() => {
    const d = window.__raceDebug;
    (d.animals || []).forEach(an => { an.hit = true; if (an.mesh) an.mesh.visible = false; });
    (d.cars || []).forEach(c => { if (c.mesh) { c.x = 99; c.mesh.position.x = 99; } });
}, 50));

test('погоня стаи: на финальном отрезке стая бежит следом; сбросил газ — догнала и укусила (+время, не авария)', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.8');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await noAnimals(page);
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.pack && window.__raceDebug.pack.active), { timeout: 20_000 }).toBe(true);
    await expect(page.locator('#pack-meter')).toBeVisible();
    expect(await page.evaluate(() => window.__raceDebug.pack.meshes)).toBe(4);
    await page.keyboard.up('w');
    // укус — не авария: каждая авария (если машина по пути во что-то врезалась) записана в hitLog, укусы — нет
    const before = await page.evaluate(() => window.__raceDebug.strikes - window.__raceDebug.hitLog.length);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.pack.bites), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(() => window.__raceDebug.strikes - window.__raceDebug.hitLog.length)).toBe(before);
    expect(problems).toEqual([]);
});

test('рекламный щит в полосе: снёс — не авария, +щит в статистике', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.02');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await noAnimals(page);
    const boards = await page.evaluate(() => window.__raceDebug.smashBoards.map(b => ({ x: b.x, z: b.z })));
    expect(boards.length).toBeGreaterThanOrEqual(2);
    // держим полосу ближайшего щита впереди
    await page.evaluate(() => setInterval(() => {
        const d = window.__raceDebug;
        const b = d.smashBoards.filter(x => !x.smashed && x.z < d.z).sort((a, c) => c.z - a.z)[0];
        if (b) d.setX(b.x);
    }, 30));
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.stats.billboards || 0), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
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
    await page.locator('.menu-card[data-menu="race"]').click();
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
