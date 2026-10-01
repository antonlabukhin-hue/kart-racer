import { describe, it, expect } from 'vitest';
import { createRisk, riskEvent, riskTick, MAX_MULT, FEVER_TIME, CHAIN_WINDOW } from '../../src/risk-combo.js';
import { feverHold } from '../../src/fever.js';

const toMax = (r) => { let last; for (let i = 1; i < MAX_MULT; i++) last = riskEvent(r, 'nearMiss'); return last; };

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
        expect(riskTick(r, CHAIN_WINDOW + 1)).toBe(false);
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
