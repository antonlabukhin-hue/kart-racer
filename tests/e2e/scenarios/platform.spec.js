import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// Яндекс Игры (src/platform.js): ?ads=mock — тестовая реклама вместо настоящей.
// Второй шанс за рекламу (даже без «Е» и кассет), ×2 «Е» за забег на итогах, «Касса» в витрине машин.
test('площадка: второй шанс и ×2 «Е» за рекламу, «Касса» в витрине', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?ads=mock');
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await expect(page.locator('#shop-action')).toContainText('ПОЕХАЛИ');
    // «Касса» с тестовыми ценами
    await expect(page.locator('#shop-pay .pay-item')).toHaveCount(4);
    await page.locator('#shop-pay [data-pay="vhs10"]').click();
    await expect(page.locator('#shop-currency')).toContainText('📼 10');
    await page.locator('#shop-action').click();
    await waitRacing(page);

    const got = await page.evaluate(async () => {
        const g = window.__raceDebug;
        const c = g.collectibles.filter(c => c.type === 'echip' && c.active && c.baseY === 0.6 && c.z < g.z - 5).sort((a, b) => b.z - a.z)[0];
        // ставим на «Е», пока не засчитается (на медленных кадрах один кадр может запоздать)
        for (let i = 0; i < 20 && c.active; i++) { g.setStrikes(0); g.cars.forEach(car => { car.z = c.z - 300; car.mesh.position.z = car.z; }); g.setX(c.x); g.setZ(c.z + 0.2); await new Promise(r => setTimeout(r, 60)); }
        return g.stats.eChips || 0;
    });
    expect(got).toBeGreaterThan(0);

    // авария: продолжить за рекламу — отсчёт стоит, пока идёт «реклама»
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('.chance-modal .cc-pay-ad')).toBeVisible();
    await page.locator('.chance-modal .cc-pay-ad').click();
    await expect(page.locator('.ad-mock')).toBeVisible();
    await expect(page.locator('.chance-modal')).toHaveCount(0, { timeout: 5_000 });
    await expect.poll(() => page.evaluate(() => window.__raceDebug.state)).toBe('racing');

    // второй раз за рекламу нельзя (раз за забег) — есть кассеты, кнопки рекламы нет
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('.chance-modal')).toBeVisible();
    await expect(page.locator('.chance-modal .cc-pay-ad')).toHaveCount(0);
    await page.locator('.chance-modal .cc-no').click();
    await expect(page.locator('#finish-screen')).toContainText('ЗАЕЗД ОКОНЧЕН', { timeout: 10_000 });

    // ×2 «Е» за рекламу на итогах
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].season.chips);
    const dbl = page.locator('#finish-actions .ad-double');
    await expect(dbl).toContainText('×2');
    await dbl.click();
    await expect(dbl).toContainText('удвоено', { timeout: 5_000 });
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].season.chips);
    const gain = Number((await dbl.textContent()).match(/\+(\d+)/)[1]);
    expect(gain).toBeGreaterThanOrEqual(got);
    expect(after - before).toBe(gain);
    expect(problems).toEqual([]);
});

test('площадка: на обычном сайте рекламы и «Кассы» нет', async ({ page }) => {
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await expect(page.locator('#shop-action')).toContainText('ПОЕХАЛИ');
    await expect(page.locator('#shop-pay')).toBeHidden();
});
