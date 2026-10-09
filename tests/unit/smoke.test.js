import { describe, it, expect } from 'vitest';
import { puffAt, PUFF_LIFE } from '../../src/smoke.js';

describe('дым', () => {
    it('клуб поднимается, растёт, сносится ветром и тает к концу жизни', () => {
        const a = puffAt(0.5, 1), b = puffAt(3, 1), end = puffAt(PUFF_LIFE, 1);
        expect(b.dy).toBeGreaterThan(a.dy);
        expect(b.s).toBeGreaterThan(a.s);
        expect(b.dx).toBeGreaterThan(a.dx);
        expect(end.a).toBeCloseTo(0);
        expect(puffAt(0, 1).a).toBe(0); // появляется плавно
    });
});
