import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// Глава 5: задание «Перелететь зверя» — на трассе «звериная тропа»: трамплин в средней полосе, за ним зверь
test('звериная тропа: с трамплина машина перелетает зверя, задание засчитывается', async ({ page }) => {
    test.skip(!!process.env.CI, 'прыжок над идущим зверем — точный тайминг, только локально');
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.1');
    await page.evaluate(() => {
        const list = JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]');
        list.forEach(p => { p.campaign = Object.assign({}, p.campaign, { unlocked: 5, completed: ['c01', 'c02', 'c03', 'c04'] }); p.hasSeenShop = true; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(list));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="campaign"]').click();
    await page.locator('.camp-track[data-idx="4"]').click();
    await page.locator('#campaign-quality-go').click();
    await waitRacing(page);
    const trail = await page.evaluate(() => window.__raceDebug.ramps.find(r => r.trailRamp));
    expect(trail).toBeTruthy();
    // держим среднюю полосу и не даём другим зверям мешать
    await page.evaluate(() => setInterval(() => {
        const d = window.__raceDebug;
        d.setX(0);
        (d.animals || []).forEach(an => { if (!an.trail) { an.hit = true; if (an.mesh) an.mesh.visible = false; } });
        (d.cars || []).forEach(c => { if (c.mesh) { c.x = 99; c.mesh.position.x = 99; } });
    }, 30));
    /* газ жмётся сам (W — прыжок) */
    await expect.poll(() => page.evaluate(() => window.__raceDebug.stats.animalsJumped), { timeout: 40_000 }).toBeGreaterThanOrEqual(1);
    /* газ жмётся сам (W — прыжок) */
    expect(problems).toEqual([]);
});
