import { test, expect } from '@playwright/test';
import { login, watchProblems, waitRacing } from '../helpers.js';

// телефон: меню вертикально, заезд — боком; управление на экране — кнопки (основа) или свайпы (по выбору в «Настройках»)
test.use({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
});

// заезд на телефоне просит полный экран; в полноэкранном окне браузер не даёт «повернуть» телефон (setViewportSize) — на CI так и падало
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { Element.prototype.requestFullscreen = function() { return Promise.resolve(); }; });
});

async function swipe(page, dx, dy) {
    await page.evaluate(({ dx, dy }) => {
        const el = document.querySelector('canvas') || document.body;
        const at = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
        const fire = (type, x, y) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
            touches: type === 'touchend' ? [] : [at(x, y)], changedTouches: [at(x, y)] }));
        fire('touchstart', 420, 200); fire('touchmove', 420 + dx / 2, 200 + dy / 2); fire('touchmove', 420 + dx, 200 + dy); fire('touchend', 420 + dx, 200 + dy);
    }, { dx, dy });
}

test('по умолчанию — кнопки руля, газа и тормоза', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('#main-menu-play').click();
    await page.setViewportSize({ width: 844, height: 390 }); // повернули телефон
    await waitRacing(page);
    for (const id of ['#btnGas', '#btnBrake', '#btnLeft', '#btnRight']) await expect(page.locator(id)).toBeVisible();
    expect(problems).toEqual([]);
});

test('свайпы: газ сам, свайп влево/вправо — в соседнюю полосу, кнопок руля нет', async ({ page }) => {
    const problems = watchProblems(page);
    await page.addInitScript(() => localStorage.setItem('road_racing_settings_v1', JSON.stringify({ controls: 'swipe' })));
    await login(page);
    await page.locator('#main-menu-play').click();
    await page.setViewportSize({ width: 844, height: 390 }); // повернули телефон
    await waitRacing(page);
    for (const id of ['#btnGas', '#btnBrake', '#btnLeft', '#btnRight']) await expect(page.locator(id)).toBeHidden();
    await expect(page.locator('#btnPauseMobile')).toBeVisible();
    // газ без пальца на экране
    await expect.poll(() => page.evaluate(() => window.__raceDebug.speed), { timeout: 10_000 }).toBeGreaterThan(0.05);
    // попутки и зверей — подальше: проверяем руль, а не аварию
    const clear = () => page.evaluate(() => { const g = window.__raceDebug; g.setStrikes(0); g.cars.forEach(c => { c.z = g.z - 400; if (c.mesh) c.mesh.position.z = c.z; }); });
    await clear();
    await swipe(page, -90, 6);
    await expect.poll(async () => { await clear(); return page.evaluate(() => window.__raceDebug.x); }, { timeout: 5_000 }).toBeLessThan(-1.6);
    await swipe(page, 90, -4);
    await expect.poll(async () => { await clear(); return page.evaluate(() => Math.abs(window.__raceDebug.x)); }, { timeout: 5_000 }).toBeLessThan(0.4);
    expect(problems).toEqual([]);
});

// эксперимент «как Subway Surfers»: заезд вертикально, телефон не поворачиваем; «Авто» — свайпы
test('вертикально: заезд без «поверни телефон», свайпы по умолчанию', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('#main-menu-play').click();
    await waitRacing(page);
    await expect(page.locator('#rotate-lock')).toBeHidden();
    await expect(page.locator('#btnGas')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__raceDebug.speed), { timeout: 10_000 }).toBeGreaterThan(0.05);
    const clear = () => page.evaluate(() => { const g = window.__raceDebug; g.setStrikes(0); g.cars.forEach(c => { c.z = g.z - 400; if (c.mesh) c.mesh.position.z = c.z; }); });
    await clear();
    await swipe(page, 90, 4);
    await expect.poll(async () => { await clear(); return page.evaluate(() => window.__raceDebug.x); }, { timeout: 5_000 }).toBeGreaterThan(1.6);
    expect(problems).toEqual([]);
});
