import { test, expect } from '@playwright/test';
import { openFreeRace, watchProblems, login } from '../helpers.js';

// ?lang=en — английский интерфейс: меню, HUD и пауза
test('английский: меню, заезд и пауза переведены', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Tester', './?lang=en&start=0.3');
    await expect(page.locator('.menu-card[data-menu="infinite"]')).toContainText('Endless Road');
    await expect(page.locator('.menu-card[data-menu="endless"]')).toContainText('Beast Hour');
    await openFreeRace(page);
    const shop = page.locator('#shop-action');
    if (await shop.isVisible()) await shop.click();
    await expect(page.locator('.difficulty-btn[data-diff="easy"]')).toContainText('EASY');
    await page.locator('.difficulty-btn[data-diff="easy"]').click();
    await expect(page.locator('#lore-panel-0')).toContainText('5 crashes and the race is over.');
    await page.locator('#lore-panel-0 .lore-btn.primary').click();
    await page.locator('#map-select-go').click();
    await expect(page.locator('#game-hud')).toContainText('TIME', { timeout: 20_000 });
    await expect(page.locator('#game-hud')).toContainText('CRASHES');
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state), { timeout: 20_000 }).toBe('racing');
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-overlay')).toContainText('PAUSED');
    await expect(page.locator('#pause-overlay')).toContainText('Resume');
    expect(problems).toEqual([]);
});
