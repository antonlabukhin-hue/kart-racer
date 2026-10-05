import { describe, it, expect } from 'vitest';
import { swipeDir, laneTarget, createSwipe, LANE_X, BRAKE_MS } from '../../src/swipe-control.js';

// руль игры со свайпом (src/main.js): шаг свайпа задаёт скорость вбок, xPos += v·15·dt
function drive(sw, x, dt, frames, log) {
    for (let i = 0; i < frames; i++) {
        const st = sw.step(x, dt);
        if (st) { if (st.x != null) x = st.x; else x += st.v * dt * 15; }
        if (log) log.push(x);
    }
    return x;
}

describe('свайп-руль', () => {
    it('направление: короткое касание — не свайп, горизонталь важнее при равных; отклик с 16 px', () => {
        expect(swipeDir(10, 5)).toBe(null);
        expect(swipeDir(17, 3)).toBe('right');
        expect(swipeDir(-60, 20)).toBe('left');
        expect(swipeDir(60, -59)).toBe('right');
        expect(swipeDir(5, 70)).toBe('down');
        expect(swipeDir(5, -70)).toBe('up');
    });

    it('цель — соседняя полоса; два свайпа подряд — через полосу; за край не уходит', () => {
        expect(laneTarget(0.3, null, 'left')).toBe(-2);
        expect(laneTarget(-1.8, 0, 'right')).toBe(2);
        expect(laneTarget(2, null, 'right')).toBe(2);
        expect(laneTarget(-2, null, 'left')).toBe(-2);
    });

    it('машина встаёт ровно в центр полосы, без перелёта, быстрее 0,3 с — при 60 и 30 кадрах', () => {
        for (const dt of [1 / 60, 1 / 30]) {
            const sw = createSwipe(), log = [];
            sw.swipe('right', 0, 0);
            expect(drive(sw, 0, dt, 60, log)).toBe(LANE_X[2]);
            expect(Math.max(...log)).toBeLessThanOrEqual(2);
            expect(log.findIndex(x => x === 2) * dt).toBeLessThan(0.3);
            sw.swipe('left', 2, 0); sw.swipe('left', 2, 0); // два свайпа — в левую полосу
            expect(drive(sw, 2, dt, 90)).toBe(LANE_X[0]);
        }
    });

    it('газ жмётся сам; свайп вниз — короткий тормоз', () => {
        const sw = createSwipe();
        expect(sw.keys(0, 0, 0)).toEqual({ w: true, s: false, a: false, d: false });
        sw.swipe('down', 0, 1000);
        expect(sw.keys(0, 0, 1100)).toMatchObject({ w: false, s: true });
        expect(sw.keys(0, 0, 1000 + BRAKE_MS + 1)).toMatchObject({ w: true, s: false });
    });
});
