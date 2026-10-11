import { describe, it, expect } from 'vitest';
import { createRisk, riskEvent, riskTick, MAX_MULT, FEVER_TIME, CHAIN_WINDOW } from '../../src/risk-combo.js';
import { feverHold } from '../../src/fever.js';

const toMax = (r) => { let last; for (let i = 1; i < MAX_MULT; i++) last = riskEvent(r, 'nearClose'); return last; }; // ступень — только за настоящий риск (STEP_KINDS)

describe('«В УДАРЕ»', () => {
    it('×5 в бесконечной трассе зажигает «В ударе», в остальных режимах — нет', () => {
        const r = createRisk(true);
        expect(toMax(r)).toMatchObject({ mult: MAX_MULT, fever: true });
        expect(r.fever).toBe(FEVER_TIME);
        expect(r.fevers).toBe(1);
        expect(riskEvent(r, 'jump').fever).toBe(false); // уже горит — не перезапускается
        const off = createRisk();
        expect(toMax(off).fever).toBe(false);
        expect(off.fever).toBe(0);
    });
    it('пока горит, цепочка не гаснет; погас — множитель снова ×1', () => {
        const r = createRisk(true);
        toMax(r);
        expect(riskTick(r, FEVER_TIME * 0.6)).toBe(false); // пока горит — цепочка держится
        expect(r.mult).toBe(MAX_MULT);
        expect(riskTick(r, FEVER_TIME)).toBe(true);
        expect(r).toMatchObject({ mult: 1, fever: 0, timer: 0 });
        // можно зажечь снова
        expect(toMax(r).fever).toBe(true);
        expect(r.fevers).toBe(2);
    });
    it('пока горит — магнит и двойные «Е», нитро держится', () => {
        const r = createRisk(true), pw = { magnet: 0, x2: 12 };
        expect(feverHold(r, pw)).toBe(0);
        toMax(r);
        expect(feverHold(r, pw)).toBeGreaterThan(0);
        expect(pw).toEqual({ magnet: FEVER_TIME, x2: 12 });
    });
});

import { STEP_KINDS } from '../../src/risk-combo.js';
describe('«В ударе» — только за настоящий риск', () => {
    it('обычное «на волоске», труба и посадка — очки без ступени; в кампании — ступень за любое', () => {
        const r = createRisk(true);
        ['nearMiss', 'landing', 'billboard', 'nearMiss'].forEach(k => riskEvent(r, k));
        expect(r.mult).toBe(1);
        expect(r.points).toBeGreaterThan(0);
        expect(riskEvent(r, 'nearPerfect').mult).toBe(2);
        expect(STEP_KINDS).toContain('jump');
        const camp = createRisk(false);
        riskEvent(camp, 'nearMiss');
        expect(camp.mult).toBe(2);
    });
});
