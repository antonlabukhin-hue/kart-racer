import { test, expect } from '@playwright/test';

// На сервере GitHub игра рисуется на процессоре в 2–3 раза медленнее, чем дома:
// проверяем, что машина едет, а не как быстро
import { openFreeRace, watchProblems, countShouts, login, startFreeRace, startCampaign, progress } from './helpers.js';

test('игра загружается, three из сборки', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto('./');
    await expect(page.locator('#profile-login-btn')).toBeEnabled();
    expect(await page.evaluate(() => window.THREE && window.THREE.REVISION)).toBe('185');
    expect(problems).toEqual([]);
});

test('вход по Enter, профиль сохраняется после перезагрузки', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Антон');
    await page.reload();
    await page.locator('#splash-screen').click();
    await expect(page.locator('#profile-list')).toContainText('Антон');
    expect(problems).toEqual([]);
});

test('«Сразу в путь» из «Заезда» открывает заезд без выбора трассы', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await openFreeRace(page);
    const shop = page.locator('#shop-action');
    if (await shop.isVisible()) await shop.click();
    await page.locator('#main-menu-quick-race').click();
    await expect(page.locator('#game-hud')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#difficulty-screen')).toBeHidden();
    await page.keyboard.down('w');
    await expect.poll(() => progress(page), { timeout: 30_000 }).toBeGreaterThan(1);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

test('свободный заезд: машина едет, звери кричат', async ({ page }) => {
    test.setTimeout(180_000);
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

test('выход в меню во время отсчёта 3-2-1 убирает цифру', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await startFreeRace(page);
    await expect(page.locator('#race-countdown')).toBeAttached();
    await page.keyboard.press('Escape');
    await page.locator('#pause-menu').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    await expect(page.locator('#race-countdown')).toHaveCount(0);
    expect(problems).toEqual([]);
});

test('сборка для сайта не знает про ?start тестовой сборки', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.97');
    await startFreeRace(page);
    // полоска прогресса обновляется только после отсчёта: ждём GO и немного едем
    await expect(page.locator('#race-countdown')).toHaveCount(0, { timeout: 30_000 });
    await page.keyboard.down('w');
    await expect.poll(() => progress(page), { timeout: 30_000 }).toBeGreaterThan(0);
    await page.keyboard.up('w');
    expect(await progress(page)).toBeLessThan(20);
    expect(problems).toEqual([]);
});

test('экраны меню открываются без ошибок', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    for (const [card, screen, back] of [
        ['garage', '#garage-screen', '#garage-close-btn'],
        ['season', '#rewards-screen', null],
        ['trophies', '#garage-panel-trophies', '#garage-close-btn'],
    ]) {
        await page.locator(`[data-menu="${card}"]`).click();
        await expect(page.locator(screen)).toBeVisible();
        if (back) await page.locator(back).click();
        else await page.locator(screen).getByRole('button', { name: /Назад|меню/i }).first().click();
        await expect(page.locator('#main-menu-screen')).toBeVisible();
    }
    // машины покупаются из гаража — и назад в гараж
    await page.locator('[data-menu="garage"]').click();
    await page.locator('#main-menu-shop').click();
    await expect(page.locator('#shop-screen')).toBeVisible();
    await page.locator('#shop-close').click();
    await expect(page.locator('#garage-screen')).toBeVisible();
    await page.locator('#garage-close-btn').click();
    // профиль: одна кнопка слева → экран профиля, там же смена профиля
    await page.locator('#mm-profile').click();
    await expect(page.locator('.pf-card')).toContainText('Сменить профиль');
    await page.locator('.pf-logout').click();
    await expect(page.locator('#profile-screen')).toBeVisible();
    expect(problems).toEqual([]);
});

test('первый заезд: «Даю установку:» держит отсчёт до «Погнали», второй раз не показывается', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Новичок', './', { briefing: true });
    await startFreeRace(page);
    const br = page.locator('#race-briefing');
    await expect(br).toBeVisible();
    await expect(br).toContainText('Даю установку:');
    await expect(br).toContainText('5 аварий');
    // отсчёт и время стоят, пока плашка открыта
    await page.waitForTimeout(4500);
    await expect(page.locator('#timeDisplay')).toHaveText('1:30');
    expect(await progress(page)).toBeLessThan(1);
    await page.locator('#race-briefing-go').click();
    await expect(br).toHaveCount(0);
    await page.keyboard.down('w');
    await expect.poll(() => progress(page), { timeout: 30_000 }).toBeGreaterThan(1);
    await page.keyboard.up('w');
    // второй заезд — без плашки
    await page.keyboard.press('Escape');
    await page.locator('#pause-menu').click();
    await startFreeRace(page);
    await page.waitForTimeout(1500);
    await expect(br).toHaveCount(0);
    expect(problems).toEqual([]);
});

test('настройки сохраняются и применяются после перезагрузки', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Настройщик');
    await page.locator('#main-menu-settings').click();
    const scr = page.locator('#settings-screen');
    await expect(scr).toBeVisible();
    await scr.locator('input[data-key="music"]').fill('20');
    await scr.locator('.st-choice[data-key="quality"] button[data-v="high"]').click();
    await scr.locator('.st-choice[data-key="camera"] button[data-v="1"]').click();
    await page.locator('#settings-close').click();
    await expect(scr).toHaveCount(0);
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Настройщик').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    expect(await page.evaluate(() => window.soundEngine.musicVolume)).toBeCloseTo(0.2);
    await page.locator('#main-menu-settings').click();
    await expect(page.locator('#settings-screen .st-choice[data-key="quality"] button.on')).toHaveAttribute('data-v', 'high');
    await expect(page.locator('#settings-screen .st-choice[data-key="camera"] button.on')).toHaveAttribute('data-v', '1');
    expect(problems).toEqual([]);
});

test('с выбора карты можно вернуться к сложности и в меню', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    // панель игрока и громкость в меню не показываются (раньше просвечивали сквозь затемнение и не нажимались)
    await expect(page.locator('#player-bar')).toBeHidden();
    await expect(page.locator('#volume-controls')).toBeHidden();
    const toMapSelect = async () => {
        await openFreeRace(page);
        const shop = page.locator('#shop-action');
        if (await shop.isVisible()) await shop.click();
        await page.locator('.difficulty-btn[data-diff="easy"]').click();
        const skip = page.locator('#lore-screen .lore-panel.active button', { hasText: /Пропустить|ПОЕХАЛИ/ }).first();
        const map = page.locator('#map-select-screen');
        // лор показывается не всегда; .or().first() брал скрытый экран карт — ждём, что видно хоть одно
        await expect.poll(async () => (await skip.isVisible()) || (await map.isVisible()), { timeout: 10_000 }).toBe(true);
        if (await skip.isVisible()) await skip.click();
        await expect(map).toBeVisible();
    };
    await toMapSelect();
    await page.locator('#map-select-back').click();
    await expect(page.locator('#difficulty-screen')).toBeVisible();
    await expect(page.locator('#map-select-screen')).toBeHidden();
    await page.locator('#diff-menu').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();

    await toMapSelect();
    await page.locator('#map-select-menu').click();
    await expect(page.locator('#main-menu-screen')).toBeVisible();
    await expect(page.locator('#map-select-screen')).toBeHidden();
    expect(problems).toEqual([]);
});

test('трофеи в гараже с картинками', { tag: '@smoke' }, async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await page.locator('[data-menu="garage"]').click();
    await page.locator('.garage-tab[data-gtab="trophies"]').click();
    await page.locator('.tro-tab[data-tro="cups"]').click(); // кубки — третья вкладка «Трофеев»
    const imgs = page.locator('#trophy-grid img.trophy-img');
    await expect(imgs).toHaveCount(10);
    await expect.poll(() => imgs.evaluateAll(list => list.filter(i => i.complete && i.naturalWidth > 0).length)).toBe(10);
    await page.locator('.trophy-slot').first().click();
    await expect.poll(() => page.locator('#trophy-detail-img').evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
    expect(problems).toEqual([]);
});

// Едем прямо без руля до поражения (5 аварий: ~40 с дома, до 2–3 мин на сервере GitHub), потом «Заново».
// «Заново» после победы в кампании — быстрый сценарий в scenarios/race.spec.js
for (const mode of ['free']) {
    test('свободный заезд: «Заново» в конце заезда перезапускает трассу', async ({ page }) => {
        test.setTimeout(600_000);
        const problems = watchProblems(page);
        await login(page);
        // сложный режим: машин и зверей много, 5 аварий набираются быстро
        await startFreeRace(page, 'hard');
        await page.keyboard.down('w');
        // без своего лимита: ждём, сколько позволяет лимит теста (на медленном сервере игра идёт медленнее)
        await expect(page.locator('#finish-restart-btn')).toBeVisible({ timeout: 0 });
        await page.keyboard.up('w');
        await page.locator('#finish-restart-btn').click();

        await expect(page.locator('#game-hud')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('#profile-screen')).toBeHidden();
        await expect(page.locator('#hud-pause-btn')).toBeVisible();
        // новый заезд начинается с 0: достаточно, что машина снова поехала
        await page.keyboard.down('w');
        await expect.poll(() => progress(page), { timeout: 60_000 }).toBeGreaterThan(0);
        await page.keyboard.up('w');
        expect(problems).toEqual([]);
    });
}
