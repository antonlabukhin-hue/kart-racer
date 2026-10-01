import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, startCampaign, progress, waitRacing } from '../helpers.js';

// Тестовая сборка: ?start=… начинает заезд с этой доли трассы. Дальше тест только жмёт газ, как игрок
const profile = page => page.evaluate(() => {
    const id = localStorage.getItem('road_racing_session_player');
    return JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]').find(p => p.id === id);
});

test('босс появляется после 42% трассы', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.40');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    const boss =page.waitForEvent('console', { predicate: m => m.text().startsWith('🐻 БОСС:'), timeout: 60_000 });
    await page.keyboard.down('w');
    await boss;
    // появился на пороге, а не сразу со старта на 40%
    expect(await progress(page)).toBeGreaterThanOrEqual(41.5);
    await page.waitForTimeout(5000);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});

test('победа в свободном заезде засчитывается в профиль', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.keyboard.down('w');
    await expect(page.locator('#finish-screen')).toContainText(/ФИНИШ|ИДЕАЛЬНЫЙ ЗАЕЗД/, { timeout: 150_000 });
    // ранг D–S — у свободного заезда есть, у кампании нет (там звёзды)
    await expect(page.locator('#finish-screen .finish-rank .fr-letter')).toHaveText(/^[DCBAS]$/);
    await page.keyboard.up('w');
    const p = await profile(page);
    expect(p.stats.wins).toBe(1);
    expect(p.stats.totalRaces).toBe(1);
    expect(p.season.chips).toBeGreaterThan(0);
    expect(problems).toEqual([]);
});

// Одна победа проверяет сразу всё, что после неё: «Заново», открытие 2-й трассы и сохранение
test('кампания: победа на 1-й трассе — «Заново» работает, 2-я трасса открыта и после перезагрузки', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await startCampaign(page);
    await waitRacing(page);
    await page.keyboard.down('w');
    await expect(page.locator('#finish-screen')).toContainText('ГЛАВА 1 ПРОЙДЕНА', { timeout: 150_000 });
    await page.keyboard.up('w');
    // за победу минимум одна звезда
    await expect(page.locator('#finish-screen .finish-stars span.on').first()).toBeVisible();
    await expect(page.locator('#finish-screen .finish-rank')).toHaveCount(0);
    // три задания главы; «Не больше 1 аварии» на автопилоте выполняется
    await expect(page.locator('#finish-screen .finish-tasks > div:not(.reward)')).toHaveCount(3);
    await expect(page.locator('#finish-screen .finish-tasks')).toContainText('Не больше 1 аварии');
    // награда за главу 1: краска и «Звериный час»
    await expect(page.locator('#finish-screen .chapter-gift')).toContainText('Такси 90-х');
    await expect(page.locator('#finish-screen .chapter-gift')).toContainText('Звериный час');

    await page.locator('#finish-restart-btn').click();
    await expect(page.locator('#game-hud')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#finish-screen')).toHaveCount(0);
    await expect(page.locator('#hud-pause-btn')).toBeVisible();
    await expect(page.locator('#race-countdown')).toBeAttached();

    await page.keyboard.press('Escape');
    await page.locator('#pause-menu').click();
    await expect(page.locator('#mm-note-campaign')).toContainText('1 из');
    await expect(page.locator('.menu-card[data-menu="endless"]')).not.toHaveClass(/locked/);
    await page.locator('.menu-card[data-menu="campaign"]').click();
    await expect(page.locator('.camp-track[data-idx="1"]')).not.toHaveClass(/locked/);
    await expect(page.locator('.camp-track[data-idx="2"]')).toHaveClass(/locked/);

    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="campaign"]').click();
    await expect(page.locator('.camp-track[data-idx="1"]')).not.toHaveClass(/locked/);
    // звёзды пережили «Заново» (профиль кампании пересобирается) и перезагрузку
    await expect(page.locator('.camp-track[data-idx="0"] .ct-stars')).toContainText('★');
    await expect(page.locator('#campaign-stars-total')).toContainText('/ 51');
    await expect(page.locator('.camp-track[data-idx="0"] .ct-meta')).toContainText('задания');
    expect(problems).toEqual([]);
});

// подарок за главу: с итогов — «Смотреть в гараже» → гараж с поздравлением, подаренная краска сияет золотом, пока её не тронешь
test('кампания: подарок за главу ведёт в гараж — поздравление и золотое сияние', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.99');
    await startCampaign(page);
    await waitRacing(page);
    await page.keyboard.down('w');
    await expect(page.locator('#finish-screen')).toContainText('ГЛАВА 1 ПРОЙДЕНА', { timeout: 150_000 });
    await page.keyboard.up('w');
    await page.locator('#finish-gift-btn').click();
    await expect(page.locator('#garage-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.gift-modal')).toContainText('Такси 90-х');
    await expect(page.locator('#garage-panel-parts')).toBeVisible();
    await expect(page.locator('#garage-panel-parts .color-swatch[data-paint="yellow"]')).toHaveClass(/gift-glow/);
    await page.locator('.gift-modal .gm-ok').click();
    await expect(page.locator('.gift-modal')).toHaveCount(0);
    await page.locator('#garage-panel-parts .color-swatch[data-paint="yellow"]').click();
    await expect(page.locator('#garage-panel-parts .color-swatch[data-paint="yellow"]')).not.toHaveClass(/gift-glow/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('road_racing_profiles_v1'))[0].carLoadout.newGifts)).toEqual([]);
    expect(problems).toEqual([]);
});
