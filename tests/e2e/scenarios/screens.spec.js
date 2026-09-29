import { test, expect } from '@playwright/test';
import { watchProblems, login, waitRacing } from '../helpers.js';

test('награды сезона: «Забрать всё» начисляет и обновляет экран; события: контракт дня запускает заезд', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="rewards"]').click();
    await expect(page.locator('#rewards-progress')).toContainText('можно забрать: 1');
    await page.getByRole('button', { name: /Забрать всё доступное/ }).click();
    await expect(page.locator('#rewards-progress')).not.toContainText('можно забрать');
    await expect(page.locator('#rewards-progress')).toContainText('🍬10');
    await page.locator('#rewards-close').click();
    await page.locator('.menu-card[data-menu="events"]').click();
    await expect(page.locator('#events-body')).toContainText('Смена дня');
    await page.locator('#events-start-contract').click();
    const shop = page.locator('#shop-action');
    if (await shop.isVisible()) await shop.click();
    await page.locator('.difficulty-btn[data-diff="easy"]').click();
    const skip = page.getByRole('button', { name: /Пропустить/ });
    const go = page.locator('#map-select-go');
    await expect.poll(async () => (await skip.isVisible()) || (await go.isVisible()), { timeout: 10_000 }).toBe(true);
    if (await skip.isVisible()) await skip.click();
    await go.click();
    await waitRacing(page);
    expect(problems).toEqual([]);
});
