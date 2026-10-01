import { test, expect } from '@playwright/test';
import { login, watchProblems } from '../helpers.js';

// после обновления: яркая плашка «Появились новые машины» один раз; «Смотреть» — витрина на первой новинке, новинки — первыми и с подсветкой
test('новые машины: плашка в меню и новинки первыми в витрине', async ({ page }) => {
    const problems = watchProblems(page);
    await page.addInitScript(() => sessionStorage.setItem('keep_newcars', '1'));
    await login(page);
    const pop = page.locator('.newcars-modal');
    await expect(pop).toContainText('Появились новые машины', { timeout: 5_000 });
    await expect(pop).toContainText('Машина времени');
    await pop.locator('.nc-go').click();
    await expect(page.locator('#shop-screen')).toBeVisible();
    await expect(page.locator('#shop-plate')).toContainText('НОВИНКА');
    await expect(page.locator('#shop-plate b.is-new')).toHaveText('Трайк');
    await expect(page.locator('.shop-car-btn').first()).toHaveAttribute('data-car', 'trike');
    await expect(page.locator('.shop-car-btn.is-new')).toHaveCount(6);
    // второй раз не показывается
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(pop).toHaveCount(0);
    expect(problems).toEqual([]);
});
