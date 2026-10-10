import { test, expect } from '@playwright/test';
import { login, waitRacing, watchProblems } from '../helpers.js';

// стрелки — только в начале заезда: четыре действия по очереди, выполнил — следующее, после подныра — исчезают
test('стрелки обучения: влево, вправо, прыжок, подныр — и исчезают', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="infinite"]').click();
    await page.locator('#shop-action').click();
    await waitRacing(page);
    await page.evaluate(() => setInterval(() => { const d = window.__raceDebug; d.setStrikes(0); d.cars.forEach(c => { if (Math.abs(c.z - d.z) < 40) { c.z = d.z - 300; c.mesh.position.z = c.z; } }); }, 100));
    const arrow = page.locator('#move-arrow');
    for (const [act, key] of [['left', 'ArrowLeft'], ['right', 'ArrowRight'], ['jump', 'Space'], ['duck', 'ArrowDown']]) {
        await expect(arrow).toHaveClass(new RegExp('on ' + act), { timeout: 15_000 });
        await page.keyboard.down(key); await page.waitForTimeout(250); await page.keyboard.up(key); // нажатие запоминается, даже если стрелка горит ещё меньше секунды
    }
    await expect(arrow).not.toHaveClass(/on/, { timeout: 20_000 });
    await page.waitForTimeout(3000);
    await expect(arrow).not.toHaveClass(/on/); // до конца заезда — больше не показываются
    expect(problems).toEqual([]);
});
