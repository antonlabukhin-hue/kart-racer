import { test, expect } from '@playwright/test';
import { login, startFreeRace, watchProblems, waitRacing } from '../helpers.js';

test('чистый отрезок: 10 с без ударов — щит на машине и значок в HUD', async ({ page }) => {
    test.skip(!!process.env.CI, '10+ с чистой езды на медленном CI — долго');
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.05');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    // без зверей и машин: любой удар обнуляет отрезок
    await page.evaluate(() => setInterval(() => { (window.__raceDebug.animals || []).forEach(an => { an.hit = true; if (an.mesh) an.mesh.visible = false; }); }, 50));
    // плашка живёт 2 с и её вытесняет любая следующая («ЧИСТАЯ ПОСАДКА» после трамплина) — запоминаем все показанные
    await page.evaluate(() => {
        window.__plaques = [];
        new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
            if (n.classList && n.classList.contains('big-plaque')) window.__plaques.push(n.className + ': ' + n.textContent);
        }))).observe(document.body, { childList: true });
    });
    await page.keyboard.down('w');
    await expect.poll(() => page.evaluate(() => window.__raceDebug.cleanRun.progress), { timeout: 8_000 }).toBeGreaterThan(0.2);
    await expect.poll(() => page.evaluate(() => window.__raceDebug.cleanRun.shield), { timeout: 25_000 }).toBe(true);
    await expect(page.locator('#cleanDisplay')).toHaveClass(/shield/);
    await expect.poll(() => page.evaluate(() => window.__plaques.find(t => t.includes('armor')) || '')).toContain('БРОНЯ');
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});
