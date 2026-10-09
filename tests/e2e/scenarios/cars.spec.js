import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';
import { CAR_SHOP_ORDER } from '../../../src/content.js';

// Каждая машина из витрины: заезд бесконечной трассы стартует (не чёрный экран), машина в сцене и едет
for (const id of CAR_SHOP_ORDER) {
    test('машина «' + id + '»: бесконечная трасса стартует и машина едет', async ({ page }) => {
        const problems = watchProblems(page);
        await login(page);
        await page.evaluate(id => {
            const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
            l.forEach(p => { p.unlockedCars = Array.from(new Set([].concat(p.unlockedCars || [], [id]))); p.preferredCar = id; p.infCarPicked = true; });
            localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
        }, id);
        await page.reload();
        await page.locator('#splash-screen').click();
        await page.locator('#profile-list').getByText('Тестер').click();
        await page.locator('.menu-card[data-menu="infinite"]').click();
        await page.locator('#shop-action').click(); // витрина перед заездом: на выбранной — «Поехали»
        await waitRacing(page);
        expect(await page.evaluate(() => window.__raceDebug.car.userData.carId)).toBe(id);
        const z0 = await page.evaluate(() => window.__raceDebug.z);
        /* газ жмётся сам (W — прыжок) */
        await expect.poll(() => page.evaluate(z0 => z0 - window.__raceDebug.z, z0), { timeout: 15_000 }).toBeGreaterThan(3);
        /* газ жмётся сам (W — прыжок) */
        expect(problems).toEqual([]);
    });
}
