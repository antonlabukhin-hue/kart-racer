import { test, expect } from '@playwright/test';
import { login, startFreeRace, watchProblems, waitRacing } from '../helpers.js';

// Держать босса вплотную к машине несколько кадров — таран
async function ram(page) {
    return page.evaluate(() => new Promise(res => {
        const d = window.__raceDebug, b = d.boss;
        let n = 0;
        b.invuln = 0;
        const f = () => { b.x = d.x; b.z = d.z - 0.5; if (++n < 20) requestAnimationFrame(f); else res(b.hp); };
        f();
    }));
}

test('босс в броне: таран ранит только после промаха его атаки', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.45');
    await startFreeRace(page, 'easy');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect.poll(() => page.evaluate(() => !!(window.__raceDebug.boss && window.__raceDebug.boss.mesh)), { timeout: 5000 }).toBe(true);
    const hp0 = await page.evaluate(() => window.__raceDebug.boss.hp);
    expect(await ram(page)).toBe(hp0);            // броня
    await page.evaluate(() => window.__raceDebug.openBoss());
    expect(await ram(page)).toBe(hp0 - 1);        // открыт — удар прошёл
    expect(await page.evaluate(() => window.__raceDebug.boss.vulnT)).toBeLessThanOrEqual(0); // окно закрылось
    expect(problems).toEqual([]);
});

test('фазы босса: баррикада в двух полосах; таран навстречу — трамплин и удар сверху ×3', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page, 'Тестер', './?start=0.43');
    await startFreeRace(page, 'medium');
    await waitRacing(page);
    await page.evaluate(() => window.__raceDebug.spawnBossNow());
    await expect.poll(() => page.evaluate(() => !!(window.__raceDebug.boss && window.__raceDebug.boss.mesh)), { timeout: 5000 }).toBe(true);
    await page.keyboard.down('w');
    await page.evaluate(() => window.__raceDebug.forceBossAttack('barricade'));
    await expect.poll(() => page.evaluate(() => window.__raceDebug.bossBarricades.length), { timeout: 15_000 }).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__raceDebug.bossBarricades[0].xs.length)).toBe(2);

    // таран: держим его полосу — трамплин подбрасывает над боссом
    await page.waitForTimeout(2500);
    await page.evaluate(() => { const b = window.__raceDebug.boss; b.hp = 5; b.maxHp = 8; });
    await page.evaluate(() => window.__raceDebug.forceBossAttack('charge'));
    await expect.poll(() => page.evaluate(() => window.__raceDebug.boss.nextAttack === 'charge' && window.__raceDebug.boss.attackState === 'windup'), { timeout: 15_000 }).toBe(true);
    await page.evaluate(() => { const d = window.__raceDebug; d.setX(d.boss.chargeX); });
    // удар сверху снимает 3 (дальше может добавиться обычный таран)
    await expect.poll(() => page.evaluate(() => window.__raceDebug.boss.hp), { timeout: 8_000 }).toBeLessThanOrEqual(2);
    await page.keyboard.up('w');
    expect(problems).toEqual([]);
});
