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

// новичку — не всё сразу: окна новостей с 3-го захода, «Слово дня», «Рекорды», «Заезд дня» и «Тест-драйв» — со 2-го дня
test('новичок: без окон новостей до 3-го захода, без «Слова дня» и др. до 2-го дня', async ({ page }) => {
    const problems = watchProblems(page);
    await page.addInitScript(() => { sessionStorage.setItem('keep_newcars', '1'); sessionStorage.setItem('keep_hello', '1'); });
    await login(page, 'Новичок', './', { fresh: true });
    await page.waitForTimeout(2000);
    await expect(page.locator('.newcars-modal')).toHaveCount(0);
    await expect(page.locator('.hello-modal')).toHaveCount(0);
    await expect(page.locator('#main-menu-screen .mm-extras')).toBeHidden();
    await expect(page.locator('#main-menu-play')).toBeVisible();
    // второй заход в тот же день — всё ещё без новостей
    const again = async () => {
        await page.reload();
        await page.locator('#splash-screen').click();
        await page.locator('#profile-list').getByText('Новичок').click();
        await expect(page.locator('#main-menu-screen')).toBeVisible();
        await page.waitForTimeout(2000);
    };
    await again();
    await expect(page.locator('.newcars-modal')).toHaveCount(0);
    await expect(page.locator('.hello-modal')).toHaveCount(0);
    // третий заход, и уже второй день игры: новости и карточки меню
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        l.forEach(p => { if (p.name === 'Новичок') p.visits = { n: p.visits.n, days: 1, last: '2020-01-01' }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await again();
    await expect(page.locator('.newcars-modal, .hello-modal').first()).toBeVisible({ timeout: 5_000 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1')).find(p => p.name === 'Новичок').visits)).toMatchObject({ n: 3, days: 2 });
    await expect(page.locator('#main-menu-screen .mm-extras')).toBeAttached();
    expect(await page.locator('#main-menu-screen').evaluate(el => el.classList.contains('mm-fresh'))).toBe(false);
    expect(problems).toEqual([]);
});
