import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace, waitRacing } from '../helpers.js';

// «Ещё раз» за секунду: на поражении R (или «Повторить») — и через ~1 с снова едешь; «почти доехал» — на экране
test('«Повторить»: короткий отсчёт, R на финише, «до финиша оставалось»', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.9');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.end('crash'));
    await expect(page.locator('#finish-screen')).toContainText('до финиша оставалось', { ignoreCase: true });
    await expect(page.locator('#finish-screen')).toContainText('почти доехал');
    // какие цифры показал отсчёт после «Повторить»: должен начаться сразу с «1» (по игровому времени, не по часам —
    // на медленном CI кадры длиннее)
    await page.evaluate(() => {
        window.__cd = [];
        new MutationObserver(() => { const el = document.getElementById('race-countdown'); if (el && window.__cd[window.__cd.length - 1] !== el.textContent) { window.__cd.push(el.textContent); } })
            .observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    await page.keyboard.press('r');
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state), { timeout: 30_000 }).toBe('racing');
    const seen = await page.evaluate(() => window.__cd.filter(t => /^[0-9]$/.test(t)));
    expect(seen).toEqual(['1']);
    expect(problems).toEqual([]);
});

// Множитель за риск: «на волоске» растит ×, авария сжигает; на финише — очки риска и прогресс заданий
test('множитель за риск в заезде и задания на финише', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.5');
    // три задания на виду в меню
    await expect(page.locator('#mm-missions .mmm-row')).toHaveCount(3);
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    // задание «на волоске» — чтобы точно был прогресс
    // два «на волоске»; у него перезарядка 1.2 с игрового времени — повторяем, пока не засчитается второй
    await page.evaluate(() => window.__raceDebug.nearMissNow());
    await expect.poll(async () => page.evaluate(() => { const d = window.__raceDebug; if (d.risk.events < 2) d.nearMissNow(); return d.risk.events; }),
        { timeout: 30_000, intervals: [300] }).toBe(2);
    await expect(page.locator('#risk-hud .rk-mult')).toHaveText('×3');
    const pts = await page.evaluate(() => window.__raceDebug.risk.points);
    expect(pts).toBe(50 + 100);
    await page.evaluate(() => window.__raceDebug.end('win'));
    await expect(page.locator('#finish-screen .fin-risk')).toContainText('150', { timeout: 20_000 });
    await expect(page.locator('#finish-screen .fin-risk')).toContainText('×3');
    expect(problems).toEqual([]);
});

// Серия дней: огонёк в меню, сундук дня забирается один раз — фишки и жвачки на счёт
test('серия дней: сундук дня', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await expect(page.locator('#mm-streak')).toBeVisible();
    await expect(page.locator('#mm-streak-n')).toHaveText('1');
    await expect(page.locator('#mm-badge-chest')).toBeVisible();
    await page.locator('#mm-streak').click();
    await expect(page.locator('.chest-modal')).toContainText('Серия: 1 день подряд');
    await page.locator('.ch-claim').click();
    await expect(page.locator('.chest-modal .ch-got')).toContainText('+20 Е');
    await page.locator('.ch-later').click();
    await expect(page.locator('.chest-modal')).toHaveCount(0);
    await expect(page.locator('#mm-badge-chest')).toBeHidden();
    await expect(page.locator('#mm-chips')).toHaveText('20');
    // вернулся на следующий день — серия 2 и сундук предлагается сам
    await page.evaluate(() => {
        const l = JSON.parse(localStorage.getItem('road_racing_profiles_v1'));
        const d = new Date(); d.setDate(d.getDate() - 1);
        const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        l.forEach(p => { p.streak = { count: 1, last: k, claimed: k }; });
        localStorage.setItem('road_racing_profiles_v1', JSON.stringify(l));
    });
    await page.reload();
    await page.locator('#splash-screen').click();
    await page.locator('#profile-list').getByText('Тестер').click();
    await expect(page.locator('.chest-modal')).toContainText('Серия: 2 дня подряд');
    await page.locator('.ch-claim').click();
    await expect(page.locator('.chest-modal .ch-got')).toContainText('+30 Е');
    expect(problems).toEqual([]);
});
