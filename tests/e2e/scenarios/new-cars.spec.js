import { test, expect } from '@playwright/test';
import { login, watchProblems } from '../helpers.js';

// после обновления: яркая плашка «Появились новые машины» один раз; «Смотреть» — витрина на своей машине («едь на ней»),
// в ряду — подарочные, следом своя (подсвечена), новинки — с меткой
test('новые машины: плашка в меню и новинки первыми в витрине', async ({ page }) => {
    const problems = watchProblems(page);
    await page.addInitScript(() => sessionStorage.setItem('keep_newcars', '1'));
    await login(page);
    const pop = page.locator('.newcars-modal');
    await expect(pop).toContainText('Появились новые машины', { timeout: 5_000 });
    await expect(pop).toContainText('Машина времени');
    await pop.locator('.nc-go').click();
    await expect(page.locator('#shop-screen')).toBeVisible();
    await expect(page.locator('#shop-plate')).toContainText('Твоя — едь на ней');
    await expect(page.locator('.shop-car-btn').first()).toHaveAttribute('data-car', 'trike'); // подарочные — первыми
    await expect(page.locator('.shop-car-btn').nth(2)).toHaveAttribute('data-car', 'cheburashka'); // следом — своя
    await expect(page.locator('.shop-car-btn.mine')).toHaveAttribute('data-car', 'cheburashka');
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
