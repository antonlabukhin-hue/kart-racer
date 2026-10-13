import { describe, it, expect } from 'vitest';
import { abVariant, failRules, AB_KEY, CHASE_AB, CHASE_HEARTS } from '../../src/fail-rules.js';
import { createChaseState, onCrash, CHASE_TIME } from '../../src/police-chase.js';

function mem() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; }

describe('правило провала A/B', () => {
    it('вариант выпадает один раз и хранится', () => {
        const st = mem();
        expect(abVariant(st, () => 0.7)).toBe('chase');
        expect(st.m[AB_KEY]).toBe('chase');
        expect(abVariant(st, () => 0.1)).toBe('chase'); // жребий второй раз не бросается
        expect(abVariant(mem(), () => 0.2)).toBe('hearts');
    });

    it('адрес ?fail= — принудительно; тестовая сборка — «сердца» без жребия', () => {
        const st = mem();
        expect(abVariant(st, () => 0.9, '?x=1&fail=hearts')).toBe('hearts');
        expect(abVariant(st, () => 0.1, '?fail=chase', 'hearts')).toBe('chase');
        expect(abVariant(st, () => 0.9, '', 'hearts')).toBe('hearts');
        expect(st.m[AB_KEY]).toBeUndefined();
    });

    it('«сердца»: три (у «Рафика» четыре), ГАИ — только за машины', () => {
        expect(failRules({ variant: 'hearts' })).toMatchObject({ variant: 'hearts', maxStrikes: 3, chaseAll: false, refill: false });
        expect(failRules({ variant: 'hearts', medic: true }).maxStrikes).toBe(4);
    });

    it('«ГАИ на хвосте»: два сердца, погоня за любую аварию, ушёл — сердца снова полные', () => {
        expect(failRules({ variant: 'chase' })).toEqual({ variant: 'chase', maxStrikes: CHASE_HEARTS, chaseAll: true, chaseTime: CHASE_AB, refill: true });
        expect(failRules({ variant: 'chase', medic: true }).maxStrikes).toBe(CHASE_HEARTS + 1);
    });

    it('«Заезд дня» и вызов — всегда «сердца»; условие дня про аварии — главнее', () => {
        expect(failRules({ variant: 'chase', fair: true }).variant).toBe('hearts');
        expect(failRules({ variant: 'chase', ruleStrikes: 1 })).toMatchObject({ variant: 'hearts', maxStrikes: 1, chaseAll: false });
    });

    it('погоня — своей длины', () => {
        const st = createChaseState();
        expect(onCrash(st, CHASE_AB)).toBe('chase');
        expect(st.t).toBe(CHASE_AB);
        const st2 = createChaseState();
        onCrash(st2);
        expect(st2.t).toBe(CHASE_TIME);
    });
});
