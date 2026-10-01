import { describe, it, expect } from 'vitest';
import { createCleanRun, CLEAN_SEGMENT, CLEAN_CHIPS } from '../../src/clean-run.js';

const drive = (cr, sec, moving = true) => { const out = []; for (let t = 0; t < sec; t += 0.05) { const r = cr.tick(0.05, moving); if (r) out.push(r); } return out; };

describe('чистый отрезок', () => {
    it('10 с без ударов — щит, дальше — фишки, пока щит цел', () => {
        const cr = createCleanRun();
        expect(drive(cr, CLEAN_SEGMENT - 0.5)).toEqual([]);
        expect(drive(cr, 1)).toEqual(['shield']);
        expect(cr.shield).toBe(true);
        expect(drive(cr, CLEAN_SEGMENT * 2)).toEqual(['chips', 'chips']);
        expect(cr.chips).toBe(CLEAN_CHIPS * 2);
    });

    it('щит съедает удар и отрезок начинается заново', () => {
        const cr = createCleanRun();
        drive(cr, CLEAN_SEGMENT + 3);
        expect(cr.progress).toBeGreaterThan(0.2);
        expect(cr.useShield()).toBe(true);
        expect(cr.shield).toBe(false);
        expect(cr.progress).toBe(0);
        expect(cr.useShield()).toBe(false);
    });

    it('стоя на месте не копится; удар без щита — сброс', () => {
        const cr = createCleanRun();
        expect(drive(cr, 30, false)).toEqual([]);
        drive(cr, 6);
        cr.reset();
        expect(cr.progress).toBe(0);
        expect(drive(cr, 6)).toEqual([]);
    });
});

describe('броня на несколько ударов', () => {
    it('прокачанная броня держит несколько ударов подряд', () => {
        const c = createCleanRun();
        c.grantShield(3);
        expect(c.shieldHits).toBe(3);
        expect(c.useShield()).toBe(true);
        expect(c.useShield()).toBe(true);
        expect(c.shield).toBe(true);
        expect(c.useShield()).toBe(true);
        expect(c.shield).toBe(false);
        expect(c.useShield()).toBe(false);
        c.grantShield(); c.grantShield(); // без уровня — один удар, повторная броня не копится сверх
        expect(c.shieldHits).toBe(1);
    });
});
