import { test, expect } from '@playwright/test';

// Игра как приложение: манифест с иконками, service worker кэширует игру — без сети она открывается.
// (В автотестах игра сама SW не регистрирует — navigator.webdriver; здесь регистрируем вручную тем же файлом.)
test('установка на телефон: манифест, иконки, работа без интернета', { tag: '@smoke' }, async ({ page, context }) => {
    await page.goto('./');
    const man = await page.evaluate(async () => {
        const href = document.querySelector('link[rel="manifest"]').href;
        const m = await (await fetch(href)).json();
        const icons = await Promise.all(m.icons.map(async (i) => { const r = await fetch(new URL(i.src, href)); return r.ok && (await r.blob()).size > 1000; }));
        return { name: m.name, display: m.display, start: m.start_url, icons, maskable: m.icons.some(i => i.purpose === 'maskable') };
    });
    expect(man.name).toBe('Дорожный прорыв');
    expect(man.display).toBe('fullscreen');
    expect(man.icons.every(Boolean)).toBe(true);
    expect(man.maskable).toBe(true);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    // service worker ставится и забирает управление
    await page.evaluate(async () => { await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.waitForTimeout(1500); // фоновое кэширование скриптов, стилей, картинок
    // без сети — игра открывается и доходит до входа
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#profile-login-btn')).toBeEnabled({ timeout: 15_000 });
    await context.setOffline(false);
});
