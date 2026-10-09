import { test, expect } from '@playwright/test';
import { watchProblems, login, startCampaign } from '../helpers.js';

// Главы 1–3 — обучение: подсказка тренера по ситуации; до разлома — про трамплин
test('обучение: в 1-й главе тренер подсказывает руль и разлом до подъезда к нему', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.05', { tutorial: true });
    await startCampaign(page);
    await expect(page.locator('#coach-tip.show')).toContainText('Меняй полосу', { timeout: 45_000 }); // на CI (без видеокарты) трасса строится дольше
    /* газ жмётся сам (W — прыжок) */
    await page.evaluate(() => { const g = window.__raceDebug; g.setZ(Math.min(g.z, g.gaps[0].zNear + 110)); }); // трасса вдвое длиннее — к разлому ближе
    await expect(page.locator('#coach-tip.show')).toContainText('Разлом', { timeout: 20_000 });
    // подсказка пришла раньше самого разлома
    const ahead = await page.evaluate(() => window.__raceDebug.z - window.__raceDebug.gaps[0].zNear);
    expect(ahead).toBeGreaterThan(0);
    /* газ жмётся сам (W — прыжок) */
    expect(problems).toEqual([]);
});
