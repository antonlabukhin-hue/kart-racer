import { describe, it, expect } from 'vitest';
import { swipeDir, laneTarget, createSwipe, LANE_X, BRAKE_MS } from '../../src/swipe-control.js';

// руль игры (src/main.js): разгон вбок, пока держишь, потом гашение 0.82 за кадр; xPos += v·15·dt
function drive(sw, x, dt, steer, frames) {
    let v = 0, now = 0;
    for (let i = 0; i < frames; i++) {
        const k = sw.keys(x, v, now);
        if (k.a) v = Math.max(v - steer * dt, -0.55);
        else if (k.d) v = Math.min(v + steer * dt, 0.55);
        else { v *= Math.pow(0.82, dt * 60); if (Math.abs(v) < 0.001) v = 0; }
        x += v * dt * 15;
        now += dt * 1000;
    }
    return x;
}

describe('свайп-руль', () => {
    it('направление: короткое касание — не свайп, горизонталь важнее при равных', () => {
        expect(swipeDir(10, 5)).toBe(null);
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

    it('машина встаёт в центр соседней полосы без заноса — при 60 и 30 кадрах, у разных машин', () => {
        for (const dt of [1 / 60, 1 / 30]) {
            for (const steer of [3.2, 4.4]) {
                const sw = createSwipe();
                sw.swipe('right', 0, 0);
                expect(Math.abs(drive(sw, 0, dt, steer, 120) - LANE_X[2])).toBeLessThan(0.3);
                sw.swipe('left', 2, 0); sw.swipe('left', 2, 0); // два свайпа — в левую полосу
                expect(Math.abs(drive(sw, 2, dt, steer, 150) - LANE_X[0])).toBeLessThan(0.3);
            }
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
