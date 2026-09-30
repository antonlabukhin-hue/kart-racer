import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';
import { CAR_SHOP_ORDER } from '../../../src/content.js';

// Каждая машина из витрины: заезд бесконечной трассы стартует (не чёрный экран), машина в сцене и едет
test('все машины: бесконечная трасса стартует и машина едет', async ({ page }) => {
    test.setTimeout(240_000);
    const problems = watchProblems(page);
    await login(page);
    for (const id of CAR_SHOP_ORDER) {
        await page.evaluate(id => {
            const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
            l.forEach(p => { p.unlockedCars = Array.from(new Set([].concat(p.unlockedCars || [], [id]))); p.preferredCar = id; p.infCarPicked = true; });
            localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
        }, id);
        await page.reload();
        await page.locator('#splash-screen').click();
        await page.locator('#profile-list').getByText('Тестер').click();
        await page.locator('.menu-card[data-menu="infinite"]').click();
        await waitRacing(page);
        await expect.poll(() => page.evaluate(() => window.__raceDebug.car && window.__raceDebug.car.userData.carId), { message: id }).toBe(id);
        const z0 = await page.evaluate(() => window.__raceDebug.z);
        await page.keyboard.down('w');
        await expect.poll(() => page.evaluate(z0 => z0 - window.__raceDebug.z, z0), { message: id + ' едет', timeout: 10_000 }).toBeGreaterThan(3);
        await page.keyboard.up('w');
        await page.evaluate(() => window.exitRaceToMenu(false));
    }
    expect(problems).toEqual([]);
});
