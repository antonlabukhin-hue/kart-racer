import { test, expect } from '@playwright/test';
import { watchProblems, login, waitRacing } from '../helpers.js';

test('«Подарки»: что ждёт и прогресс; вкладка «Сезон» — «Забрать всё» начисляет и обновляет экран', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    // кнопка «Подарки» сияет: награда сезона ур.1 и непрочитанные новости
    await expect(page.locator('#mm-badge-season')).toBeVisible();
    await expect(page.locator('.mm-tab[data-menu="season"]')).toHaveClass(/glow/);
    await page.locator('[data-menu="season"]').click();
    await expect(page.locator('#gifts-body')).toContainText('Награды сезона');
    await expect(page.locator('#gifts-body')).toContainText('Машина недели');
    await expect(page.locator('#rewards-screen .season-tab[data-stab="events"]')).toHaveCount(0); // «События» убраны
    await page.locator('#rewards-screen .season-tab[data-stab="rewards"]').click();
    await expect(page.locator('#rewards-progress')).toContainText('можно забрать: 1');
    await expect(page.locator('#rewards-screen .sb-rewards')).toHaveText('1');
    await page.getByRole('button', { name: /Забрать всё доступное/ }).click();
    await expect(page.locator('#rewards-progress')).not.toContainText('можно забрать');
    await expect(page.locator('#rewards-progress')).toContainText('Е 100'); // награда ур.1 — в «Е» (жвачек больше нет)
    await expect(page.locator('#rewards-progress')).not.toContainText('🍬');
    await expect(page.locator('#rewards-screen .sb-rewards')).toBeHidden();
    expect(problems).toEqual([]);
});
