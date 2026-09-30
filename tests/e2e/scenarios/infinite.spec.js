import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// «Бесконечная трасса» вместо свободного заезда: нет финиша, босса и лимита времени; пейзажи сменяются,
// «Е» собираются, позади всё убирается; конец — только по авариям, с рекордом дальности
test('бесконечная трасса: пейзажи, «Е», уборка позади и итог с рекордом', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('.menu-card[data-menu="race"]')).toBeHidden();
    await page.locator('.menu-card[data-menu="infinite"]').click();
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

    // конец — по авариям: итог с дальностью и рекордом, в меню — рекорд на карточке
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('ЗАЕЗД ОКОНЧЕН', { timeout: 10_000 });
    await expect(page.locator('#finish-screen')).toContainText('НОВЫЙ РЕКОРД ДАЛЬНОСТИ');
    await page.locator('#finish-menu-btn').click();
    await expect(page.locator('#menu-inf-best')).toContainText(/🏆 \d+ м/);
    expect(problems).toEqual([]);
});
