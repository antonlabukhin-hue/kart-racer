import { describe, it, expect } from 'vitest';
import { threatClass, pickMarks, warnPick, createWarnState, markAlpha, THREAT_CLASSES, MARK_NEAR, MARK_FAR, WARN_AT, WARN_GAP } from '../../src/threat-style.js';
import { HAZARD_KIND } from '../../src/hazards.js';

describe('язык угроз: четыре класса', () => {
    it('у каждой помехи — один из четырёх классов; «тормозит» и «заносит» совпадают с поведением помех', () => {
        Object.keys(HAZARD_KIND).forEach(k => expect(threatClass(k)).toBe(HAZARD_KIND[k] === 'skid' ? 'slide' : 'slow'));
        expect(threatClass('hurdle')).toBe('block');
        expect(threatClass('gap')).toBe('block');
        expect(threatClass('animal')).toBe('threat');
        expect(threatClass('crate')).toBe(null); // ящик — награда, не метим
        expect(Object.keys(THREAT_CLASSES)).toEqual(['block', 'slow', 'slide', 'threat']);
        const colors = new Set(Object.values(THREAT_CLASSES).map(c => c.color)), sounds = new Set(Object.values(THREAT_CLASSES).map(c => c.sfx));
        expect(colors.size).toBe(4); expect(sounds.size).toBe(4);
    });

    it('метки — только впереди в окне, ближние первыми', () => {
        const z = 0, items = [{ z: -20, cls: 'slow' }, { z: -5, cls: 'block' }, { z: 5, cls: 'slow' }, { z: -(MARK_FAR + 5), cls: 'slide' }, { z: -1, cls: 'threat' }, { z: -10, cls: null }];
        const m = pickMarks(items, z);
        expect(m.map(x => x.d)).toEqual([5, 20]);
        expect(pickMarks(Array.from({ length: 20 }, (_, i) => ({ z: -(MARK_NEAR + 1 + i), cls: 'slow' })), 0, 3).length).toBe(3);
    });

    it('звук — один раз на помеху, не чаще WARN_GAP', () => {
        const st = createWarnState(), a = { d: WARN_AT - 1, cls: 'block', ref: {} }, b = { d: WARN_AT - 2, cls: 'slide', ref: {} };
        expect(warnPick(st, [{ d: WARN_AT + 5, cls: 'slow', ref: {} }], 0)).toBe(null); // далеко
        expect(warnPick(st, [a], 1)).toBe('block');
        expect(warnPick(st, [a], 2)).toBe(null);                 // уже звучала
        expect(warnPick(st, [b], 1 + WARN_GAP / 2)).toBe(null);  // рано — молча, но помечена
        expect(warnPick(st, [b], 5)).toBe(null);
    });

    it('кольцо гаснет вдали и у самой машины', () => {
        expect(markAlpha(MARK_FAR, 0)).toBe(0);
        expect(markAlpha(MARK_NEAR, 0)).toBe(0);
        expect(markAlpha(20, 0)).toBeGreaterThan(0.4);
    });
});
