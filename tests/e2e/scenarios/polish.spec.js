import { test, expect } from '@playwright/test';
import { login, startFreeRace, watchProblems, waitRacing } from '../helpers.js';

const wheelAngle = (page) => page.evaluate(() => { let a = 0; window.__raceDebug.car.traverse(o => { if (o.userData && o.userData.isWheel) a = o.rotation.x; }); return a; });

test('колёса крутятся на ходу; на финише машина стоит, облетает только камера', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.985');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    const a0 = await wheelAngle(page);
    await page.keyboard.down('w');
    await expect.poll(() => wheelAngle(page).then(a => Math.abs(a - a0)), { timeout: 10_000 }).toBeGreaterThan(3);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.state), { timeout: 60_000 }).toBe('win');
    await page.keyboard.up('w');
    const r1 = await page.evaluate(() => window.__raceDebug.car.rotation.y);
    await page.waitForTimeout(1500);
    const r2 = await page.evaluate(() => window.__raceDebug.car.rotation.y);
    expect(r1).toBe(0);
    expect(r2).toBe(0);
    expect(problems).toEqual([]);
});

test('гараж: после покупки улучшения фишки в шапке уменьшаются сразу', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.evaluate(() => {
        const list = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
        list.forEach(p => { p.season = Object.assign({}, p.season, { chips: 5000 }); p.econVer = 2; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(list));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('[data-menu="garage"]').click();
    await expect(page.locator('#garage-player-name')).toContainText('Е 5000');
    // краска: нажал — примерка и плашка «Купить / Отмена», «Е» не списаны; «Купить» — списаны
    await page.getByRole('button', { name: /Кастом/ }).click();
    await page.locator('.color-swatch[data-paint="red"]').click();
    await expect(page.locator('.try-bar')).toContainText('Арсеньев красный');
    await expect(page.locator('#garage-player-name')).toContainText('Е 5000');
    await page.locator('.try-bar .try-buy').click();
    await expect(page.locator('#garage-player-name')).toContainText('Е 4500');
    await page.getByRole('button', { name: /Прокачка/ }).click();
    await page.locator('#garage-panel-upgrades button[data-up]').first().click();
    await expect(page.locator('#garage-player-name')).not.toContainText('Е 4500');
    expect(problems).toEqual([]);
});
