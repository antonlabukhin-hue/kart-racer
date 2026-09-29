import { test, expect } from '@playwright/test';
import { watchProblems, login, waitRacing } from '../helpers.js';

// «Вызов другу»: ссылка открывает баннер, забег идёт по сиду из ссылки, на финише — итог и своя ссылка-вызов
test('вызов другу: баннер по ссылке → забег по сиду друга → итог и ссылка в ответ', async ({ page }) => {
    const problems = watchProblems(page);
    // как на CI: нет «Поделиться», буфер обмена запрещён — ссылка должна показаться в плашке, без системных окон
    await page.addInitScript(() => {
        try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); } catch (e) {}
        try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }); } catch (e) {}
    });
    await login(page, 'Тестер', './?start=0.99&ch=3F7A-21C9&s=500&w=2&n=Друг');
    await expect(page.locator('#challenge-banner')).toBeVisible();
    await expect(page.locator('#challenge-banner')).toContainText('Вызов от Друг');
    // параметры вызова убраны из адреса
    expect(page.url()).not.toContain('ch=');
    await page.locator('#challenge-accept').click();
    await waitRacing(page);
    expect(await page.evaluate(() => window.__endless && window.__endless.seed)).toBe(0x3f7a21c9);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('Вызов Друг (500)');
    await page.locator('#finish-challenge-btn').click();
    const url = await page.evaluate(() => window.__lastChallengeUrl);
    expect(url).toContain('ch=3F7A-21C9');
    expect(url).toContain('n=');
    await expect(page.locator('.share-link input')).toHaveValue(/ch=3F7A-21C9/);
    await page.locator('.share-link .sl-close').click();
    await expect(page.locator('.share-link')).toHaveCount(0);
    expect(problems).toEqual([]);
});
