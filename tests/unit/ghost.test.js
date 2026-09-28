import { describe, it, expect } from 'vitest';
import { createGhostRecorder, sampleGhost, isValidGhost, isBetterGhost, ghostKey, GHOST_STEP, createGhostDelta, formatGhostDelta } from '../../src/ghost.js';

describe('призрак лучшего заезда', () => {
    it('пишет точку раз в шаг и воспроизводит с интерполяцией', () => {
        const rec = createGhostRecorder();
        for (let i = 0; i <= 30; i++) rec.update(1 / 60, i * 0.1, -i, 0); // полсекунды при 60 fps
        const g = rec.finish(50, 'turbo');
        expect(isValidGhost(g)).toBe(true);
        expect(g.x.length).toBeGreaterThanOrEqual(5);
        expect(g.x.length).toBeLessThanOrEqual(7);
        const a = sampleGhost(g, 0), b = sampleGhost(g, GHOST_STEP * 1.5);
        expect(a.z).toBe(g.z[0]);
        expect(b.z).toBeCloseTo((g.z[1] + g.z[2]) / 2, 5);
        expect(sampleGhost(g, 999)).toBeNull();
    });

    it('долгий кадр не сжимает время: точки между кадрами интерполируются', () => {
        const rec = createGhostRecorder();
        rec.update(0.016, 0, 0, 0);
        rec.update(1, 0, -10, 0); // за секунду проехал 10
        const g = rec.finish(1, 'x');
        expect(g.x.length).toBe(11);
        // через 0.5 с призрак на полпути, а не в конце
        expect(sampleGhost(g, 0.5).z).toBeCloseTo(-10 * (0.5 - 0.016) / 1, 0);
    });

    it('сохраняется только более быстрый заезд, битые данные не принимаются', () => {
        const g = { v: 1, step: 0.1, time: 60, car: 'x', x: [0, 1], z: [0, 1], y: [0, 0] };
        expect(isBetterGhost(null, 70)).toBe(true);
        expect(isBetterGhost(g, 59)).toBe(true);
        expect(isBetterGhost(g, 61)).toBe(false);
        expect(isValidGhost({ v: 1, step: 0.1, time: 1, x: [0, 1], z: [0], y: [0, 0] })).toBe(false);
        expect(ghostKey('id1', 'arsenev', 'hard')).toBe('road_racing_ghost_v1_id1_arsenev_hard');
    });
});

describe('живое отставание от призрака', () => {
    // призрак ехал ровно 10 м/с: z = −t·10
    const g = { v: 1, step: 0.1, time: 5, car: 'c', x: [], y: [], z: [] };
    for (let i = 0; i <= 50; i++) { g.x.push(0); g.y.push(0); g.z.push(-i); }

    it('быстрее призрака — минус, медленнее — плюс', () => {
        const d = createGhostDelta(g);
        expect(d(-10, 0.8)).toBeCloseTo(-0.2, 6); // доехал до 10 м за 0.8 с, призрак — за 1.0
        expect(d(-20, 2.5)).toBeCloseTo(0.5, 6);
    });

    it('откат назад (удар) и точки за пределами записи', () => {
        const d = createGhostDelta(g);
        d(-30, 3);
        expect(d(-25, 3.2)).toBeCloseTo(0.7, 6);
        expect(d(1, 0)).toBeNull();
        expect(d(-60, 7)).toBeNull();
        expect(createGhostDelta(null)(-1, 1)).toBeNull();
    });

    it('подпись', () => {
        expect(formatGhostDelta(-0.84)).toBe('−0.8 с');
        expect(formatGhostDelta(1.25)).toBe('+1.3 с');
        expect(formatGhostDelta(0)).toBe('−0.0 с');
    });
});
