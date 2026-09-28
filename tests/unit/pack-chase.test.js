import { describe, it, expect } from 'vitest';
import { createPackChase, PACK_START, PACK_END, MAX_GAP, PACK_SPEED_K } from '../../src/pack-chase.js';

const V = 25, PACK = V * PACK_SPEED_K;
const run = (pc, sec, progress, v) => { const ev = []; for (let t = 0; t < sec; t += 0.05) { const e = pc.update(0.05, progress, v, PACK); if (e) ev.push(e); } return ev; };

describe('погоня стаи', () => {
    it('начинается на последних процентах трассы и заканчивается перед финишем', () => {
        const pc = createPackChase();
        expect(run(pc, 1, PACK_START - 0.01, V)).toEqual([]);
        expect(pc.active).toBe(false);
        expect(run(pc, 0.1, PACK_START, V)).toEqual(['start']);
        expect(run(pc, 0.1, PACK_END, V)).toEqual(['end']);
        expect(pc.active).toBe(false);
    });

    it('на полном ходу стая отстаёт до предела и не кусает', () => {
        const pc = createPackChase();
        pc.update(0.05, PACK_START, V, PACK);
        expect(run(pc, 20, 0.9, V)).toEqual([]);
        expect(pc.gap).toBeCloseTo(MAX_GAP, 6);
        expect(pc.danger).toBe(0);
    });

    it('после удара (скорость упала) стая догоняет и кусает, потом отстаёт — не чаще раза в 2 с', () => {
        const pc = createPackChase();
        pc.update(0.05, PACK_START, V, PACK);
        const ev = run(pc, 3, 0.9, V * 0.3);
        expect(ev).toContain('bite');
        expect(ev.filter(e => e === 'bite').length).toBeLessThanOrEqual(2);
        expect(pc.danger).toBeGreaterThan(0.3);
        expect(pc.bites).toBeGreaterThanOrEqual(1);
    });
});
