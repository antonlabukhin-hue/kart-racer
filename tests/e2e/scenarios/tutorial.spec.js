import { test, expect } from '@playwright/test';
import { watchProblems, login, startCampaign } from '../helpers.js';

// Главы 1–3 — обучение: подсказка тренера по ситуации; до разлома — про трамплин
test('обучение: в 1-й главе тренер подсказывает руль и разлом до подъезда к нему', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.05');
    await startCampaign(page);
    await expect(page.locator('#coach-tip.show')).toContainText('Меняй полосу', { timeout: 20_000 });
    await page.keyboard.down('w');
    await expect(page.locator('#coach-tip.show')).toContainText('Разлом', { timeout: 20_000 });
    // подсказка пришла раньше самого разлома
    const ahead = await page.evaluate(() => window.__raceDebug.z - window.__raceDebug.gaps[0].zNear);
    expect(ahead).toBeGreaterThan(0);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});
