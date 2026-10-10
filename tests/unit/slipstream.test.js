import { describe, it, expect } from 'vitest';
import { createSlip, draftTarget, stepSlip, addSlipCharge, useNitro, justSlung, SLIP_NEAR, SLIP_FAR, SLIP_HW, NM_CHARGE } from '../../src/slipstream.js';

const car = (x, z, o) => Object.assign({ x, z, hitCooldown: 0 }, o || {});

describe('слипстрим и нитро по кнопке', () => {
    it('мешок — ближайшая попутка в своей полосе, впереди в пределах SLIP_NEAR..SLIP_FAR', () => {
        const a = car(0, -10), b = car(0, -5), side = car(2, -4), behind = car(0, 3), far = car(0, -SLIP_FAR - 2), close = car(0, -0.2);
        expect(draftTarget([a, b, side, behind, far, close], 0, 0).car).toBe(b);
        expect(draftTarget([side, behind, far, close], 0, 0)).toBe(null);
        expect(draftTarget([car(SLIP_HW - 0.1, -6)], 0, 0)).not.toBe(null);
        expect(draftTarget([car(0, -6, { _fly: true }), car(0, -7, { hitCooldown: 1 })], 0, 0)).toBe(null); // снесённая и только что задетая
    });

    it('бак копится в мешке, ближе к бамперу — быстрее; полный — один раз «готово»', () => {
        const near = createSlip(), far = createSlip();
        stepSlip(near, [car(0, -(SLIP_NEAR + 0.5))], 0, 0, 0.5, true);
        stepSlip(far, [car(0, -(SLIP_FAR - 0.5))], 0, 0, 0.5, true);
        expect(near.charge).toBeGreaterThan(far.charge * 2);
        const s = createSlip(), c = [car(0, -4)];
        let readyN = 0;
        for (let i = 0; i < 200; i++) if (stepSlip(s, c, 0, 0, 0.05, true).ready) readyN++;
        expect(s.charge).toBe(1);
        expect(readyN).toBe(1);
    });

    it('выключен («В ударе», транспорт, в воздухе) — не копит', () => {
        const s = createSlip();
        const o = stepSlip(s, [car(0, -5)], 0, 0, 1, false);
        expect(s.charge).toBe(0);
        expect(o.drafting).toBe(false);
    });

    it('«Рывок» в самый последний момент — бампер в бампер — тоже засчитан', () => {
        const s = createSlip(), c = car(0, -8);
        for (let i = 0; i < 12; i++) { c.z += 0.6; stepSlip(s, [c], 0, 0, 0.05, true); } // догнали вплотную: dz ≈ 0.8
        expect(s.car).toBe(c);
        expect(stepSlip(s, [c], 1.5, 0, 0.05, true).sling).toBe(true);
    });

    it('«Рывок»: посидел в мешке и ушёл вбок, пока попутка близко', () => {
        const s = createSlip(), c = car(0, -9);
        for (let i = 0; i < 8; i++) { c.z += 0.4; stepSlip(s, [c], 0, 0, 0.05, true); } // догоняем
        expect(s.car).toBe(c);
        const o = stepSlip(s, [c], 1.5, 0, 0.05, true); // перестроился
        expect(o.sling).toBe(true);
        expect(s.slips).toBe(1);
        expect(justSlung(s)).toBe(true);
    });

    it('без «Рывка»: мелькнул в мешке, отстал или врезался', () => {
        const quick = createSlip(), c1 = car(0, -5);
        stepSlip(quick, [c1], 0, 0, 0.05, true);
        expect(stepSlip(quick, [c1], 1.5, 0, 0.05, true).sling).toBe(false); // 0.05 с — мало
        const lag = createSlip(), c2 = car(0, -15);
        for (let i = 0; i < 10; i++) stepSlip(lag, [c2], 0, 0, 0.05, true);
        c2.z = -SLIP_FAR - 3;
        expect(stepSlip(lag, [c2], 0, 0, 0.05, true).sling).toBe(false); // попутка ушла вперёд
        const hit = createSlip(), c3 = car(0, -4);
        for (let i = 0; i < 10; i++) stepSlip(hit, [c3], 0, 0, 0.05, true);
        c3.hitCooldown = 1.2; c3.x = 0.3;
        expect(stepSlip(hit, [c3], 1.5, 0, 0.05, true).sling).toBe(false); // это был удар, не манёвр
    });

    it('нитро по кнопке — только с полным баком; «на волоске» доливает', () => {
        const s = createSlip();
        expect(useNitro(s)).toBe(false);
        addSlipCharge(s, NM_CHARGE);
        expect(s.charge).toBeCloseTo(NM_CHARGE);
        addSlipCharge(s, 5);
        expect(s.charge).toBe(1);
        expect(useNitro(s)).toBe(true);
        expect(s.charge).toBe(0);
        expect(s.uses).toBe(1);
        expect(useNitro(s)).toBe(false);
    });
});

describe('подсказка про мешок', () => {
    it('раз на устройство, когда впервые набрал в мешке', async () => {
        const { slipHintDue, HINT_KEY } = await import('../../src/slipstream.js');
        const m = {}, st = { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = v; } };
        const s = createSlip();
        s.charge = 0.05; s.car = {};
        expect(slipHintDue(s, st)).toBe(false);
        s.charge = 0.2;
        expect(slipHintDue(s, st)).toBe(true);
        expect(m[HINT_KEY]).toBe('1');
        expect(slipHintDue(createSlip(), st)).toBe(false);
        const s2 = createSlip(); s2.charge = 0.3; s2.car = {};
        expect(slipHintDue(s2, st)).toBe(false);
    });
});

describe('«Рывок» — только за свой манёвр', () => {
    it('попутка сама ушла из полосы — не «Рывок»', () => {
        const s = createSlip(), c = { x: 0, z: -9, hitCooldown: 0 };
        for (let i = 0; i < 8; i++) { c.z += 0.4; stepSlip(s, [c], 0, 0, 0.05, true); }
        c.x = 2;
        expect(stepSlip(s, [c], 0, 0, 0.05, true).sling).toBe(false);
    });
});
