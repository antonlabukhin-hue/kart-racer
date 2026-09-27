import { test, expect } from '@playwright/test';
import { watchProblems, login, startFreeRace } from '../helpers.js';

// Раскладка участков берётся из src/tracks/layouts.json: на лёгкой Арсеньев — два разлома на 27% и 84%
test('трасса из данных: разломы, арки и сцена стоят по раскладке', async ({ page }) => {
    const problems = watchProblems(page);
    await login(page);
    await startFreeRace(page, 'easy');
    await expect.poll(() => page.evaluate(() => window.__raceDebug && window.__raceDebug.state), { timeout: 20_000 }).toBe('racing');
    const r = await page.evaluate(() => ({
        layout: window.__trackLayout,
        gaps: window.__raceDebug.gaps.length,
        debris: window.__raceDebug.debrisZones.length,
        event: !!window.__raceDebug.mapEvent
    }));
    expect(r.layout.gaps).toEqual([0.27, 0.84]);
    expect(r.gaps).toBe(2);
    expect(r.debris).toBe(r.layout.debris.length);
    expect(r.event).toBe(true);
    expect(problems).toEqual([]);
});
