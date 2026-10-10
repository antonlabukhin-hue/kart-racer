import { describe, it, expect } from 'vitest';
import { CRATE_OUTCOMES, rollCrate } from '../../src/hazards.js';

describe('ящик «?»', () => {
    it('исходы по весам: хороших больше, плохие тоже бывают', () => {
        let a = 12345;
        const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        const n = {};
        for (let i = 0; i < 5000; i++) { const o = rollCrate(rnd); n[o.id] = (n[o.id] || 0) + 1; }
        CRATE_OUTCOMES.forEach(o => expect(n[o.id]).toBeGreaterThan(0));
        const good = CRATE_OUTCOMES.filter(o => o.good).reduce((s, o) => s + n[o.id], 0);
        expect(good / 5000).toBeGreaterThan(0.6);
        expect(good / 5000).toBeLessThan(0.8);
    });
    it('крайние значения генератора не ломают выбор', () => {
        expect(rollCrate(() => 0).id).toBe(CRATE_OUTCOMES[0].id);
        expect(rollCrate(() => 0.999999).id).toBe(CRATE_OUTCOMES[CRATE_OUTCOMES.length - 1].id);
    });
});

import { hazardKind, HAZARD_KIND, SLOW_MUL } from '../../src/hazards.js';
describe('помехи на асфальте — два поведения', () => {
    it('яма, кочка, шипы, смола тормозят; масло, лёд, кислота заносят', () => {
        ['pothole', 'bump', 'spikes', 'tar'].forEach(function(t) { expect(hazardKind(t)).toBe('slow'); });
        ['oil', 'ice', 'acid'].forEach(function(t) { expect(hazardKind(t)).toBe('skid'); });
        expect(hazardKind('что-то новое')).toBe('slow');
        expect(new Set(Object.values(HAZARD_KIND)).size).toBe(2);
        expect(SLOW_MUL).toBeGreaterThan(0.4);
    });
});
