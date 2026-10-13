import { describe, it, expect } from 'vitest';
import { createChaseState, onCrash, tickChase, CHASE_TIME } from '../../src/police-chase.js';

describe('погоня ГАИ', () => {
    it('первая авария — погоня на CHASE_TIME с; вторая за это время — поймали', () => {
        const st = createChaseState();
        expect(onCrash(st)).toBe('chase');
        expect(st.t).toBe(CHASE_TIME);
        tickChase(st, 3);
        expect(onCrash(st)).toBe('caught');
        expect(st.t).toBe(0);
    });
    it('отстала — следующая авария снова только погоня', () => {
        const st = createChaseState();
        onCrash(st);
        tickChase(st, CHASE_TIME + 1);
        expect(st.t).toBe(0);
        expect(onCrash(st)).toBe('chase');
    });
});

import { policeStep } from '../../src/police-chase.js';
describe('машина ГАИ едет плавно', () => {
    it('сторона не прыгает от шевеления руля, x догоняет цель мягко', () => {
        let p = { side: 0, x: 2, gap: 0 };
        const xs = [];
        for (let i = 0; i < 60; i++) { p = Object.assign(p, policeStep(p, 0.45 + (i % 2 ? 0.1 : -0.1), 1.6, i / 60, 1 / 60)); xs.push(p.x); }
        expect(p.side).toBe(1); // игрок в средней полосе — ГАИ справа, и не перескакивает
        for (let i = 1; i < xs.length; i++) expect(Math.abs(xs[i] - xs[i - 1])).toBeLessThan(0.1);
    });
    it('игрок ушёл в крайнюю полосу со стороны ГАИ — она переходит на другую сторону', () => {
        const s = policeStep({ side: 1, x: 2, gap: 1.6 }, 2, 1.6, 0, 1 / 60);
        expect(s.side).toBe(-1);
    });
});
