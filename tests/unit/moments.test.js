import { describe, it, expect } from 'vitest';
import { MOMENTS, planMoments, momentOfWeek, weekNo, fits } from '../../src/moments.js';
import { record, FUN_ACHIEVEMENTS } from '../../src/fun-achievements.js';
import { ACHIEVEMENTS } from '../../src/content.js';

const seq = function(a) { let i = 0; return function() { return a[i++ % a.length]; }; };

describe('моменты на трассе', () => {
    it('мем недели — свой каждую неделю, по кругу', () => {
        const d = new Date(2026, 9, 12);
        const next = new Date(2026, 9, 19);
        expect(weekNo(next) - weekNo(d)).toBe(1);
        expect(momentOfWeek(next).id).not.toBe(momentOfWeek(d).id);
        expect(momentOfWeek(new Date(2026, 9, 13)).id).toBe(momentOfWeek(d).id); // та же неделя
    });
    it('в каждом заезде — мем недели; редкий — иногда и другой', () => {
        const village = { style: 'village' };
        const p1 = planMoments(new Date(2026, 9, 12), seq([0.5, 0.5, 0.9]), function() { return village; });
        expect(p1.length).toBe(1);
        const p2 = planMoments(new Date(2026, 9, 12), seq([0.5, 0.1, 0.5]), function() { return village; });
        expect(p2.length).toBe(2);
        expect(p2[0].id).not.toBe(p2[1].id);
        expect(p2[0].at).toBeGreaterThanOrEqual(400);
    });
    it('ночью без бабушки и коровы, ёжик — не в городе', () => {
        const g = MOMENTS.find(function(m) { return m.id === 'granny_cross'; }), h = MOMENTS.find(function(m) { return m.id === 'hedgehog'; });
        expect(fits(g, { style: 'arsenev', night: true })).toBe(false);
        expect(fits(h, { style: 'city' })).toBe(false);
        expect(fits(h, { style: 'forest' })).toBe(true);
    });
});

describe('достижения-шутки', () => {
    it('открываются по счётчику один раз и есть в общем списке', () => {
        const p = {};
        for (let i = 0; i < 9; i++) expect(record(p, 'board')).toEqual([]);
        expect(record(p, 'board')).toEqual(['perforator']);
        expect(record(p, 'board')).toEqual([]);
        expect(record(p, 'late_train')).toEqual(['late_train']);
        FUN_ACHIEVEMENTS.forEach(function(a) { expect(ACHIEVEMENTS.some(function(x) { return x.id === a.id; })).toBe(true); });
    });
});
