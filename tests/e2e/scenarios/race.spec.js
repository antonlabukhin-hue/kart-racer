import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, startCampaign, progress } from '../helpers.js';

// Тестовая сборка: ?start=… начинает заезд с этой доли трассы. Дальше тест только жмёт газ, как игрок
const profile = page => page.evaluate(() => {
    const id = localStorage.getItem('road_racing_session_player');
    return JSON.parse(localStorage.getItem('road_racing_profiles_v1') || '[]').find(p => p.id === id);
});

test('босс появляется после 42% трассы', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.40');
    await startFreeRace(page, 'easy');
    const boss = page.waitForEvent('console', { predicate: m => m.text().startsWith('🐻 БОСС:'), timeout: 60_000 });
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
    await page.keyboard.down('w');
    await expect(page.locator('#finish-screen')).toContainText(/ФИНИШ|ИДЕАЛЬНЫЙ ЗАЕЗД/, { timeout: 150_000 });
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
    await page.keyboard.down('w');
    await expect(page.locator('#finish-screen')).toContainText('ГЛАВА 1 ПРОЙДЕНА', { timeout: 150_000 });
    await page.keyboard.up('w');

    await page.locator('#finish-restart-btn').click();
    await expect(page.locator('#game-hud')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#finish-screen')).toHaveCount(0);
    await expect(page.locator('#hud-pause-btn')).toBeVisible();
    await expect(page.locator('#race-countdown')).toBeAttached();

    await page.keyboard.press('Escape');
    await page.locator('#pause-menu').click();
    await page.locator('.menu-card[data-menu="campaign"]').click();
    await expect(page.locator('.camp-track[data-idx="1"]')).not.toHaveClass(/locked/);
    await expect(page.locator('.camp-track[data-idx="2"]')).toHaveClass(/locked/);

    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await page.locator('.menu-card[data-menu="campaign"]').click();
    await expect(page.locator('.camp-track[data-idx="1"]')).not.toHaveClass(/locked/);
    expect(problems).toEqual([]);
});
