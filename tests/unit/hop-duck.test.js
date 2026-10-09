import { describe, it, expect } from 'vitest';
import { createMoves, hop, duck, tickMoves, ducking, duckScale, hurdleHit, planHurdles, HOP_V, DUCK_TIME, HURDLE_FROM, FULL_FROM, LOWBAR_H } from '../../src/hop-duck.js';
import { GRAVITY } from '../../src/race-physics.js';

describe('прыжок и подныр', () => {
    it('прыжок — только с земли; пик выше трубы', () => {
        const st = createMoves();
        expect(hop(st, false)).toBe(0);
        expect(hop(st, true)).toBe(HOP_V);
        expect(HOP_V * HOP_V / (2 * GRAVITY)).toBeGreaterThan(LOWBAR_H + 0.4);
    });
    it('подныр длится DUCK_TIME, машина приседает и встаёт', () => {
        const st = createMoves();
        expect(duck(st, true)).toBe(false);
        expect(duck(st, false)).toBe(true);
        tickMoves(st, 0.3); expect(ducking(st)).toBe(true); expect(duckScale(st)).toBeLessThan(0.6);
        tickMoves(st, DUCK_TIME); expect(ducking(st)).toBe(false); expect(duckScale(st)).toBe(1);
    });
    it('труба — перепрыгнуть, шлагбаум — только поднырнуть', () => {
        expect(hurdleHit('lowbar', 0.8, false)).toBe('over');
        ['pipe', 'log', 'jersey', 'tires'].forEach(function(k) { expect(hurdleHit(k, 0.8, false)).toBe('over'); expect(hurdleHit(k, 0, true)).toBe('hit'); });
        ['barrier', 'gantry', 'pipeline'].forEach(function(k) { expect(hurdleHit(k, 0, true)).toBe('under'); expect(hurdleHit(k, 1.1, false)).toBe('hit'); });
        expect(hurdleHit('lowbar', 0, true)).toBe('hit');
        expect(hurdleHit('highbar', 0, true)).toBe('under');
        expect(hurdleHit('highbar', 0.9, false)).toBe('hit');
        expect(hurdleHit('highbar', 0, false)).toBe('hit');
    });
    it('новичку — не раньше HURDLE_FROM; через всю дорогу — только дальше FULL_FROM', () => {
        for (let k = 0; k < 30; k++) {
            planHurdles(0, 4000).forEach(function(p) {
                expect(p.d).toBeGreaterThanOrEqual(HURDLE_FROM);
                if (p.lanes.length === 3) expect(p.d).toBeGreaterThan(FULL_FROM);
                expect(p.lanes.length).toBeGreaterThan(0);
            });
        }
    });
});
