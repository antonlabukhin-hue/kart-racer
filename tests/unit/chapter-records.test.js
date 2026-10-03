import { describe, it, expect } from 'vitest';
import { localBest, worldBests, fmtTime, worldLine } from '../../src/chapter-records.js';
import { ghostKey } from '../../src/ghost.js';

describe('рекорды глав', () => {
    it('своё лучшее — из призрака; нет — null', () => {
        const m = {}; const s = { getItem: k => m[k] || null };
        expect(localBest('p1', 'c03', 'medium', s)).toBe(null);
        m[ghostKey('p1', 'camp_c03', 'medium')] = JSON.stringify({ v: 1, time: 61.4, step: 0.1, x: [0, 1], y: [0, 0], z: [0, -1] });
        expect(localBest('p1', 'c03', 'medium', s)).toBe(61.4);
        expect(localBest('p1', 'c03', 'hard', s)).toBe(null);
    });
    it('мировые лучшие по главам и строка итогов', () => {
        const w = worldBests([{ chapter: 'c01', name: 'Лёха', time_ms: 59300 }, { chapter: 'c01', name: 'Вася', time_ms: 61000 }, { chapter: 'c02', name: 'Вася', time_ms: 70000 }]);
        expect(w.c01).toEqual({ name: 'Лёха', time: 59.3 });
        expect(fmtTime(59.3)).toBe('0:59.3');
        expect(fmtTime(68.25)).toBe('1:08.3');
        expect(worldLine(w.c01, 68.6, 'Тестер')).toBe('🌍 Рекорд мира: 0:59.3 (Лёха) — до него 9.3 с');
        expect(worldLine(w.c01, 58, 'Тестер')).toContain('Новый рекорд мира');
        expect(worldLine(null, 70, 'Тестер')).toContain('Новый рекорд мира');
        expect(worldLine(w.c01, 59.3, 'Лёха')).toContain('твой');
    });
});
