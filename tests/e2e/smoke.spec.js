import { test, expect } from '@playwright/test';

// На сервере GitHub игра рисуется на процессоре в 2–3 раза медленнее, чем дома:
// проверяем, что машина едет, а не как быстро
import { watchProblems, countShouts, login, startFreeRace, startCampaign, progress } from './helpers.js';

test('игра загружается, three из сборки', async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto('./');
    await expect(page.locator('#profile-login-btn')).toBeEnabled();
    expect(await page.evaluate(() => window.THREE && window.THREE.REVISION)).toBe('185');
    expect(problems).toEqual([]);
});

test('вход по Enter, профиль сохраняется после перезагрузки', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Антон');
    await page.reload();
    await page.locator('#splash-screen').click();
    await expect(page.locator('#profile-list')).toContainText('Антон');
    expect(problems).toEqual([]);
});

test('свободный заезд: машина едет, звери кричат', async ({ page }) => {
    const problems = watchProblems(page);
    await countShouts(page);
    await login(page);
    await startFreeRace(page);
    await page.keyboard.down('w');
    await expect.poll(() => progress(page), { timeout: 30_000 }).toBeGreaterThan(1);
    await expect.poll(() => page.evaluate(() => window.__testShouts), { timeout: 60_000 }).toBeGreaterThan(0);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

test('кампания: первая трасса стартует, газ стрелкой', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await startCampaign(page);
    await page.keyboard.down('ArrowUp');
    await expect.poll(() => progress(page), { timeout: 30_000 }).toBeGreaterThan(1);
    await page.keyboard.up('ArrowUp');
    expect(problems).toEqual([]);
});

test('пауза и выход в меню посреди заезда', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await startFreeRace(page);
    await page.keyboard.down('w');
    await expect.poll(() => progress(page), { timeout: 30_000 }).toBeGreaterThan(1);
    await page.keyboard.up('w');

    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    const p1 = await progress(page);
    await page.waitForTimeout(1000);
    expect(await progress(page)).toBe(p1);
    await page.locator('#pause-resume').click();
    await expect(page.locator('#pause-overlay')).toBeHidden();

    await page.keyboard.press('Escape');
    await page.locator('#pause-menu').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    await expect(page.locator('#game-hud')).toHaveCount(0);
    // старый заезд остановлен: цикл не крутится, клавиши заезда в меню не работают
    await expect.poll(() => page.evaluate(() => window.__gameAnimationId)).toBeFalsy();
    await page.keyboard.press('q');
    expect(problems).toEqual([]);
});

test('экраны меню открываются без ошибок', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    for (const [card, screen, back] of [
        ['garage', '#garage-screen', '#garage-close-btn'],
        ['rewards', '#rewards-screen', null],
        ['events', '#events-screen', null],
    ]) {
        await page.locator(`.menu-card[data-menu="${card}"]`).click();
        await expect(page.locator(screen)).toBeVisible();
        if (back) await page.locator(back).click();
        else await page.locator(screen).getByRole('button', { name: /Назад|меню/i }).first().click();
        await expect(page.locator('#main-menu-screen')).toBeVisible();
    }
    await page.locator('#main-menu-shop').click();
    await expect(page.locator('#shop-screen')).toBeVisible();
    await page.locator('#shop-close').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    expect(problems).toEqual([]);
});

test('трофеи в гараже с картинками', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('.menu-card[data-menu="garage"]').click();
    await page.locator('.garage-tab[data-gtab="trophies"]').click();
    const imgs = page.locator('#trophy-grid img.trophy-img');
    await expect(imgs).toHaveCount(10);
    await expect.poll(() => imgs.evaluateAll(list => list.filter(i => i.complete && i.naturalWidth > 0).length)).toBe(10);
    await page.locator('.trophy-slot').first().click();
    await expect.poll(() => page.locator('#trophy-detail-img').evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
    expect(problems).toEqual([]);
});

// Едем прямо без руля до конца заезда (обычно 5 аварий: ~40 с дома, до 2–3 мин на сервере GitHub), потом «Заново»
for (const mode of ['free', 'campaign']) {
    test(`${mode === 'free' ? 'свободный заезд' : 'кампания'}: «Заново» в конце заезда перезапускает трассу`, async ({ page }) => {
        test.setTimeout(360_000);
        const problems = watchProblems(page);
        await login(page);
        if (mode === 'free') await startFreeRace(page, 'hard'); else await startCampaign(page);
        await page.keyboard.down('w');
        await expect(page.locator('#finish-restart-btn')).toBeVisible({ timeout: 240_000 });
        await page.keyboard.up('w');
        await page.locator('#finish-restart-btn').click();

        await expect(page.locator('#game-hud')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('#profile-screen')).toBeHidden();
        await expect(page.locator('#hud-pause-btn')).toBeVisible();
        await page.keyboard.down('w');
        await expect.poll(() => progress(page), { timeout: 30_000 }).toBeGreaterThan(1);
        await page.keyboard.up('w');
        expect(problems).toEqual([]);
    });
}
